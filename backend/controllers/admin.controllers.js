import User from "../models/user.model.js";
import Note from "../models/note.model.js";
import { handleDbError } from "../utils/dbError.js";
import {
  getUserSessions as getSessions,
  deleteSession,
  deleteAllUserSessions,
} from "../utils/sessionStore.js";
import bcrypt from "bcryptjs";
import { deleteImage, uploadStream } from "../services/cloudinary.service.js";
import {
  escape,
  isEmail,
  isLength,
  normalizeEmail,
} from "../utils/validator.js";
import redis from "../config/redis.js";
import { GSC_LAST_SYNCED_KEY } from "./gsc.controllers.js";

// GET /api/admin/users
export const getAllUsers = async (req, res) => {
  console.log("getall users");
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search?.trim() || "";
    const skip = (page - 1) * limit;

    const filter = {
      isDeleted: { $ne: true },
    };

    const roleFilter = req.query.filter;
    if (roleFilter === "admin") {
      filter.role = "admin";
    } else if (roleFilter === "user") {
      filter.role = "user";
    }

    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const pipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          users: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "notes",
                localField: "_id",
                foreignField: "userId",
                as: "userNotes",
                pipeline: [{ $count: "count" }],
              },
            },
            {
              $lookup: {
                from: "collections",
                localField: "_id",
                foreignField: "userId",
                as: "userCollections",
                pipeline: [{ $count: "count" }],
              },
            },
            {
              $addFields: {
                notesCount: {
                  $ifNull: [{ $arrayElemAt: ["$userNotes.count", 0] }, 0],
                },
                collectionsCount: {
                  $ifNull: [{ $arrayElemAt: ["$userCollections.count", 0] }, 0],
                },
              },
            },
            {
              $project: { password: 0, userNotes: 0, userCollections: 0 },
            },
          ],
        },
      },
    ];

    const [result] = await User.aggregate(pipeline);
    const total = result.metadata[0]?.total || 0;

    const response = {
      success: true,
      users: result.users,
      pagination: {
        totalItems: total,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
    console.log(response);
    res.status(200).json(response);
  } catch (error) {
    console.error("Error in admin.getAllUsers:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// GET /api/admin/users/:userId
export const getUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password");
    if (!user || user.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error in admin.getUser:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// PATCH /api/admin/users/:userId
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, userName, bio, socials, role, isBanned, skills } =
      req.body;

    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Username uniqueness check before staging
    if (userName !== undefined) {
      const trimmed = userName.trim();
      const exists = await User.exists({
        userName: trimmed,
        _id: { $ne: userId },
        isDeleted: { $ne: true },
      });
      if (exists) {
        return res
          .status(409)
          .json({ success: false, message: "Username is already taken." });
      }
      user.userName = trimmed;
    }

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (socials !== undefined)
      user.socials = socials.map((s) => ({ url: s.url.trim() }));
    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return res
          .status(400)
          .json({ success: false, message: "Skills must be an array." });
      }
      user.skills = skills
        .filter((s) => typeof s === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 10);
    }
    if (role !== undefined) {
      if (userId === req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Administrators cannot change their own roles.",
        });
      }
      user.role = role;
    }
    if (isBanned !== undefined) user.isBanned = isBanned;

    await user.save();

    // Audit log
    console.log(
      `[ADMIN ACTION] ${req.user.userName} updated profile of ${user.userName} (${user._id})`,
    );

    const { password, ...userWithoutPassword } = user.toObject();
    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: "User updated successfully.",
    });
  } catch (error) {
    console.error("Error in admin.updateUser:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// POST /api/admin/users/batch
export const batchUpdateUsers = async (req, res) => {
  try {
    const { userIds, action, role } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No users selected." });
    }

    if (!["delete", "ban", "unban", "assignRole"].includes(action)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action." });
    }

    let updateQuery = {};
    if (action === "ban") updateQuery = { isBanned: true };
    if (action === "unban") updateQuery = { isBanned: false };
    if (action === "assignRole") {
      if (!["user", "admin"].includes(role)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid role." });
      }
      updateQuery = { role };
    }

    const filteredUserIds = userIds.filter(
      (id) => id !== req.user._id.toString(),
    );

    if (action === "delete") {
      if (filteredUserIds.length > 0) {
        await User.updateMany(
          { _id: { $in: filteredUserIds } },
          { $set: { isDeleted: true } },
        );
      }
    } else {
      if (filteredUserIds.length > 0) {
        await User.updateMany(
          { _id: { $in: filteredUserIds } },
          { $set: updateQuery },
        );
      }
    }

    console.log(
      `[ADMIN ACTION] ${req.user.userName} performed batch ${action} on ${userIds.length} users`,
    );

    res.status(200).json({
      success: true,
      message: `Batch ${action} completed successfully.`,
    });
  } catch (error) {
    console.error("Error in admin.batchUpdateUsers:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// GET /api/admin/users/:userId/sessions
export const getUserSessionsByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    const sessions = await getSessions(userId);

    const formattedSessions = sessions.map((s) => ({
      sessionId: s.sessionId,
      deviceName: s.deviceName,
      ip: s.ip,
      location: s.location,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
    }));

    res.status(200).json({ success: true, sessions: formattedSessions });
  } catch (error) {
    console.error("Error in admin.getUserSessionsByAdmin:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// DELETE /api/admin/users/:userId/sessions/:sessionId
export const terminateUserSessionByAdmin = async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    await deleteSession(userId, sessionId);
    res
      .status(200)
      .json({ success: true, message: "Session terminated successfully." });
  } catch (error) {
    console.error("Error in admin.terminateUserSessionByAdmin:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// DELETE /api/admin/users/:userId/sessions
export const terminateAllUserSessionsByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    await deleteAllUserSessions(userId);
    res.status(200).json({
      success: true,
      message: "All sessions terminated successfully.",
    });
  } catch (error) {
    console.error("Error in admin.terminateAllUserSessionsByAdmin:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// PATCH /api/admin/users/:userId/password
export const updateUserPasswordByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Error in admin.updateUserPasswordByAdmin:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// POST /api/admin/users/:userId/avatar
export const uploadUserAvatarByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const file = req.file;

    const user = await User.findById(userId);
    if (!user || user.isDeleted)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    if (!file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded." });

    if (user.avatar) await deleteImage(user.avatar);

    const folder = `user_profiles/${user._id}`;
    const { secure_url } = await uploadStream(
      file.buffer,
      folder,
      "avatar",
      file,
    );
    user.avatar = secure_url;
    await user.save();

    console.log(
      `[ADMIN ACTION] ${req.user.userName} updated avatar of ${user.userName} (${user._id})`,
    );

    const { password, ...userWithoutPassword } = user.toObject();
    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: "Avatar updated successfully.",
    });
  } catch (error) {
    console.error("Error in admin.uploadUserAvatarByAdmin:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// DELETE /api/admin/users/:userId/avatar
export const removeUserAvatarByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user || user.isDeleted)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    if (!user.avatar)
      return res
        .status(400)
        .json({ success: false, message: "No avatar to remove." });

    await deleteImage(user.avatar);
    user.avatar = null;
    await user.save();

    console.log(
      `[ADMIN ACTION] ${req.user.userName} removed avatar of ${user.userName} (${user._id})`,
    );

    const { password, ...userWithoutPassword } = user.toObject();
    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: "Avatar removed successfully.",
    });
  } catch (error) {
    console.error("Error in admin.removeUserAvatarByAdmin:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// POST /api/admin/users/:userId/cover
export const uploadUserCoverByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const file = req.file;

    const user = await User.findById(userId);
    if (!user || user.isDeleted)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    if (!file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded." });

    if (user.cover) await deleteImage(user.cover);

    const folder = `user_covers/${user._id}`;
    const { secure_url } = await uploadStream(
      file.buffer,
      folder,
      "cover",
      file,
    );
    user.cover = secure_url;
    await user.save();

    console.log(
      `[ADMIN ACTION] ${req.user.userName} updated cover of ${user.userName} (${user._id})`,
    );

    const { password, ...userWithoutPassword } = user.toObject();
    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: "Cover updated successfully.",
    });
  } catch (error) {
    console.error("Error in admin.uploadUserCoverByAdmin:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// DELETE /api/admin/users/:userId/cover
export const removeUserCoverByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user || user.isDeleted)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    if (!user.cover)
      return res
        .status(400)
        .json({ success: false, message: "No cover to remove." });

    await deleteImage(user.cover);
    user.cover = null;
    await user.save();

    console.log(
      `[ADMIN ACTION] ${req.user.userName} removed cover of ${user.userName} (${user._id})`,
    );

    const { password, ...userWithoutPassword } = user.toObject();
    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: "Cover removed successfully.",
    });
  } catch (error) {
    console.error("Error in admin.removeUserCoverByAdmin:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// POST /api/admin/users
export const createUser = async (req, res) => {
  try {
    let { fullName, userName, email, password, bio, socials, skills } =
      req.body;

    fullName = fullName?.trim();
    userName = userName?.trim()?.toLowerCase();
    email = email?.trim();
    password = password?.trim();

    if (!fullName || !userName || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing." });
    }

    if (!isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format." });
    }

    if (!isLength(password, { min: 6 })) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    // Uniqueness checks
    const existingEmail = await User.findOne({
      email: normalizedEmail,
      isDeleted: { $ne: true },
    });
    if (existingEmail) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered." });
    }

    const existingUserName = await User.findOne({
      userName,
      isDeleted: { $ne: true },
    });
    if (existingUserName) {
      return res
        .status(409)
        .json({ success: false, message: "Username already taken." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Sanitize socials
    let sanitizedSocials = [];
    if (Array.isArray(socials)) {
      sanitizedSocials = socials
        .filter((item) => item && typeof item === "object" && item.url)
        .map((item) => ({ url: item.url.trim() }))
        .filter((item) => item.url.length > 0);
    }

    // Sanitize skills
    let sanitizedSkills = [];
    if (Array.isArray(skills)) {
      sanitizedSkills = skills
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 10);
    }

    const newUser = await User.create({
      fullName: escape(fullName),
      userName,
      email: normalizedEmail,
      password: hashedPassword,
      bio: bio?.trim() || "",
      socials: sanitizedSocials,
      skills: sanitizedSkills,
    });

    const { password: _, ...userWithoutPassword } = newUser.toObject();

    console.log(
      `[ADMIN ACTION] ${req.user.userName} created new user: ${userName} (${newUser._id})`,
    );

    res.status(201).json({
      success: true,
      message: "User created successfully.",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error in admin.createUser:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

// GET /api/admin/blogs
export const getAllBlogs = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const page  = Number(req.query.page) || 1;
    const skip  = (page - 1) * limit;

    const search       = req.query.search?.trim() || "";
    const healthFilter = req.query.health || "all";
    const indexFilter  = req.query.indexed; // "true" | "false" | undefined

    const match = {};

    if (search) {
      match.$or = [
        { name: { $regex: search, $options: "i" } },
        { "seo.title": { $regex: search, $options: "i" } },
      ];
    }

    if (healthFilter === "good")          match["seo.score"] = { $gte: 90 };
    else if (healthFilter === "warning")  match["seo.score"] = { $gte: 50, $lt: 90 };
    else if (healthFilter === "critical") match["seo.score"] = { $lt: 50 };

    // indexed filter goes directly into $match — correct pagination
    if (indexFilter === "true")       match["gsc.isIndexed"] = true;
    else if (indexFilter === "false") match["gsc.isIndexed"] = { $ne: true };

    const sortBy        = req.query.sortBy || "updated";
    const sortDirection = req.query.sortDirection || "desc";
    const order         = sortDirection === "asc" ? 1 : -1;

    let sort = { updatedAt: -1 };
    switch (sortBy) {
      case "seo":
      case "seoScore":  sort = { "seo.score": order, contentUpdatedAt: -1 }; break;
      case "created":
      case "date":
      case "createdAt": sort = { createdAt: order }; break;
      case "updated":
      case "updatedAt": sort = { contentUpdatedAt: order }; break;
      case "name":      sort = { name: order }; break;
      default:          sort = { contentUpdatedAt: -1 };
    }

    const lastSynced = await redis.get(GSC_LAST_SYNCED_KEY);

    const [result] = await Note.aggregate([
      { $match: match },
      { $sort: sort },
      {
        $facet: {
          blogs: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "collections",
                localField: "collectionId",
                foreignField: "_id",
                as: "collection",
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: { path: "$collection", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$user",       preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                name: 1,
                slug: 1,
                visibility: 1,
                contentUpdatedAt: 1,
                createdAt: 1,
                seoScore: "$seo.score",
                isIndexed: "$gsc.isIndexed",   // ← new
                gscLastSynced: "$gsc.lastSynced", // ← new
                collectionId: {
                  _id:  "$collection._id",
                  name: "$collection.name",
                  slug: "$collection.slug",
                },
                userId: {
                  _id:      "$user._id",
                  fullName: "$user.fullName",
                  email:    "$user.email",
                  userName: "$user.userName",
                  avatar:   "$user.avatar",
                },
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const blogs      = result?.blogs || [];
    const total      = result?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      blogs,
      gsc: {
        lastSynced: lastSynced || null,
      },
      pagination: {
        totalItems:      total,
        currentPage:     page,
        itemsPerPage:    limit,
        totalPages,
        hasNextPage:     page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in admin.getAllBlogs:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};


export const getBlogStats = async (req, res) => {
  try {
    const [stats] = await Note.aggregate([
      {
        $group: {
          _id: null,
          all:        { $sum: 1 },
          good:       { $sum: { $cond: [{ $gte: ["$seo.score", 90] }, 1, 0] } },
          warning:    { $sum: { $cond: [{ $and: [{ $gte: ["$seo.score", 50] }, { $lt: ["$seo.score", 90] }] }, 1, 0] } },
          critical:   { $sum: { $cond: [{ $lt:  ["$seo.score", 50] }, 1, 0] } },
          indexed:    { $sum: { $cond: ["$gsc.isIndexed", 1, 0] } },
          notIndexed: { $sum: { $cond: ["$gsc.isIndexed", 0, 1] } },
        },
      },
    ]);

    const lastSynced = await redis.get(GSC_LAST_SYNCED_KEY);

    return res.status(200).json({
      success: true,
      stats: {
        all:      stats?.all      || 0,
        good:     stats?.good     || 0,
        warning:  stats?.warning  || 0,
        critical: stats?.critical || 0,
      },
      gsc: {
        lastSynced:  lastSynced || null,
        indexed:     stats?.indexed    || 0,
        notIndexed:  stats?.notIndexed || 0,
      },
    });
  } catch (error) {
    console.error("Error in admin.getBlogStats:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};
