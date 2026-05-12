import User from "../model/user.model.js";
import { handleDbError } from "../utils/dbError.js";
import { getUserSessions as getSessions, deleteSession, deleteAllUserSessions } from "../utils/sessionStore.js";
import bcrypt from "bcryptjs";

// GET /api/admin/users
export const getAllUsers = async (req, res) => {
  console.log('getall users');
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search?.trim() || "";
    const skip = (page - 1) * limit;

    const filter = search
      ? {
        $or: [
          { userName: { $regex: search, $options: "i" } },
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
      : {};

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
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
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
    const { fullName, userName, bio, socials, role, isBanned } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Username uniqueness check before staging
    if (userName !== undefined) {
      const trimmed = userName.trim();
      const exists = await User.exists({ userName: trimmed, _id: { $ne: userId } });
      if (exists) {
        return res.status(409).json({ success: false, message: "Username is already taken." });
      }
      user.userName = trimmed;
    }

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (socials !== undefined) user.socials = socials.map((s) => ({ url: s.url.trim() }));
    if (role !== undefined) user.role = role;
    if (isBanned !== undefined) user.isBanned = isBanned;

    await user.save();

    // Audit log
    console.log(
      `[ADMIN ACTION] ${req.user.userName} updated profile of ${user.userName} (${user._id})`
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
      return res.status(400).json({ success: false, message: "No users selected." });
    }

    if (!["delete", "ban", "unban", "assignRole"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action." });
    }

    let updateQuery = {};
    if (action === "ban") updateQuery = { isBanned: true };
    if (action === "unban") updateQuery = { isBanned: false };
    if (action === "assignRole") {
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ success: false, message: "Invalid role." });
      }
      updateQuery = { role };
    }

    if (action === "delete") {
      await User.updateMany({ _id: { $in: userIds } }, { $set: { isDeleted: true } });
    } else {
      await User.updateMany({ _id: { $in: userIds } }, { $set: updateQuery });
    }

    console.log(
      `[ADMIN ACTION] ${req.user.userName} performed batch ${action} on ${userIds.length} users`
    );

    res.status(200).json({ success: true, message: `Batch ${action} completed successfully.` });
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
    const sessions = await getSessions(userId);
    
    const formattedSessions = sessions.map(s => ({
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
    await deleteSession(userId, sessionId);
    res.status(200).json({ success: true, message: "Session terminated successfully." });
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
    await deleteAllUserSessions(userId);
    res.status(200).json({ success: true, message: "All sessions terminated successfully." });
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

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.status(200).json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Error in admin.updateUserPasswordByAdmin:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};
