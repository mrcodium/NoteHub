import User from "../model/user.model.js";
import { deleteImage, uploadStream } from "../services/cloudinary.service.js";
import { sendOtp, validateOtp } from "../services/otp.service.js";
import { isEmail, normalizeEmail } from "../utils/validator.js";

export const isEmailAvailable = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    res.status(200).json({
      success: true,
      available: !existingUser,
      message: existingUser
        ? "Email is already registered"
        : "Email is available",
    });
  } catch (error) {
    console.error("Error in isEmailAvailable:", error);
    res.status(500).json({
      success: false,
      message: "Server error while checking email availability",
    });
  }
};

export const checkAuth = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ message: "User not found" });
    }
    const user = req.user;
    const { password, ...userWithoutPassword } = user.toObject();
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Error in checkAuth controller: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUser = async (req, res) => {
  let { identifier } = req.params;

  try {
    if (!identifier) {
      return res.status(400).json({ message: "Require identifier" });
    }

    identifier = identifier.trim().toLowerCase();

    // try email path first
    const normalizedEmail = normalizeEmail(identifier);
    const isEmailIdentifier =
      normalizedEmail && isEmail(normalizedEmail);

    let query;

    if (isEmailIdentifier) {
      query = { email: normalizedEmail };
    } else {
      // username is already stored lowercase → exact match
      query = { userName: identifier };
    }

    const user = await User.findOne(query).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in getUser controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const search = req.query.search?.trim().toLowerCase() || "";
    const filter = req.query.filter || "all";

    const query = {};

    // Search (prefix-based for performance)
    if (search) {
      const regex = new RegExp(`^${search}`, "i");

      query.$or = [
        { fullName: regex },
        { email: regex },
        { userName: search }, // already lowercase + indexed
      ];
    }

    // Filters
    if (filter === "online") {
      query.isOnline = true;
    } else if (filter === "oauth") {
      query.hasGoogleAuth = true;
    }

    const skip = (page - 1) * limit;

    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalUsers,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in getAllUsers controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const uploadAvatar = async (req, res) => {
  try {
    const { user } = req;
    const file = req.file;

    if (!user) {
      return res.status(404).json({ message: "You are unauthorized" });
    }
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Remove old avatar if exists
    if (user.avatar) {
      await deleteImage(user.avatar);
    }

    // Upload new avatar
    const folder = `user_profiles/${user._id}`;
    const { secure_url } = await uploadStream(file.buffer, folder);

    user.avatar = secure_url;
    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();
    return res.status(200).json({
      user: userWithoutPassword,
      message: "Profile picture updated successfully",
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const removeAvatar = async (req, res) => {
  const { user } = req;
  try {
    if (!user.avatar) {
      return res.status(400).json({ message: "No avatar to remove." });
    }

    await deleteImage(user.avatar);
    user.avatar = null;
    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();
    res.status(200).json({
      user: userWithoutPassword,
      message: "Avatar removed successfully",
    });
  } catch (error) {
    console.error("Error in removeAvatar controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const uploadCover = async (req, res) => {
  try {
    const { user } = req;
    const file = req.file;

    if (!user) {
      return res.status(404).json({ message: "You are unauthorized" });
    }
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (user.cover) {
      await deleteImage(user.cover);
    }

    const folder = `user_covers/${user._id}`;
    const { secure_url } = await uploadStream(file.buffer, folder);

    user.cover = secure_url;
    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();
    return res.status(200).json({
      user: userWithoutPassword,
      message: "Cover image updated successfully",
    });
  } catch (error) {
    console.error("Upload cover error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const removeCover = async (req, res) => {
  const { user } = req;
  try {
    if (!user.cover) {
      return res.status(400).json({ message: "No cover to remove." });
    }

    await deleteImage(user.cover);
    user.cover = null;
    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();
    res.status(200).json({
      user: userWithoutPassword,
      message: "Cover removed successfully",
    });
  } catch (error) {
    console.error("Error in removeCover controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateFullName = async (req, res) => {
  try {
    const { fullName } = req.body;
    const { user } = req;

    if (!fullName?.trim()) {
      return res.status(400).json({ message: "Full name is required." });
    }

    user.fullName = fullName;
    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();
    res.status(200).json({
      user: userWithoutPassword,
      message: "Name updated successfully.",
    });
  } catch (error) {
    console.error("error in updateFullName controller\n", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const updateUserName = async (req, res) => {
  try {
    const { userName } = req.body;
    const { user } = req;

    if (!userName?.trim()) {
      return res.status(400).json({ message: "Username is required." });
    }

    // The model's validation will handle case-insensitive checks
    user.userName = userName;
    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();
    res.status(200).json({
      user: userWithoutPassword,
      message: "Username updated successfully.",
    });
  } catch (error) {
    if (error.message.includes("Username is already taken")) {
      return res.status(400).json({ message: error.message });
    }
    console.error("error in updateUserName controller\n", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const requestEmailUpdateOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const { user } = req;

    if (!email?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required." });
    }

    if (!isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format." });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use." });
    }

    // Send OTP to new email
    await sendOtp({
      email: normalizedEmail,
      purpose: "email_update",
    });

    return res.status(200).json({
      success: true,
      message: `OTP sent to ${normalizedEmail}`,
      email: normalizedEmail.replace(
        /(.{2})(.*)(@.*)/,
        (_, a, b, c) => a + b.replace(/./g, "*") + c,
      ),
    });
  } catch (error) {
    console.error("Email update OTP error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send OTP." });
  }
};

export const confirmEmailUpdate = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const { user } = req;

    if (!email?.trim() || !otp?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required." });
    }

    if (!isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format." });
    }

    const normalizedEmail = normalizeEmail(email);

    // Validate OTP
    await validateOtp({
      email: normalizedEmail,
      purpose: "email_update",
      otp,
    });

    // Update user email
    user.email = normalizedEmail;
    await user.save();

    const { password, ...userWithoutPassword } = user.toObject();
    return res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: "Email updated successfully.",
    });
  } catch (error) {
    console.error("Email update error:", error);
    const status = error.name === "ValidationError" ? 400 : 500;
    return res
      .status(status)
      .json({
        success: false,
        message: error.message || "Failed to update email.",
      });
  }
};
