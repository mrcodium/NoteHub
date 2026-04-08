import User from "../model/user.model.js";
import { handleDbError } from "../utils/dbError.js";

// GET /api/admin/users
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
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

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
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
    const { fullName, userName, bio, socials } = req.body;

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