import mongoose from "mongoose";
import crypto from "crypto";

const reservedNames = ["admin", "root", "support", "notehub", "system"];

// helper
const generateUsername = async (base, UserModel) => {
  // pick first word if valid, else "user"
  let firstWord = (base || "")
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!firstWord || firstWord.length <= 2) {
    firstWord = "user";
  }

  const slug = firstWord.slice(0, 30);

  while (true) {
    const suffix = crypto.randomBytes(3).toString("hex"); // 6 chars
    const userName = `${slug}-${suffix}`;

    const exists = await UserModel.exists({ userName });
    if (!exists && !reservedNames.includes(slug)) {
      return userName;
    }
  }
};

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      select: false,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    userName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 39,
      lowercase: true,
      validate: [
        {
          validator: (v) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v),
          message: (props) => `Invalid username format: '${props.value}'`,
        },
        {
          validator: async function (v) {
            const user = await this.constructor.findOne({
              userName: { $regex: new RegExp(`^${v}$`, "i") },
              _id: { $ne: this._id },
            });
            return !user;
          },
          message: (props) => `Username '${props.value}' is already taken`,
        },
        {
          validator: (v) => !reservedNames.includes(v),
          message: (props) => `Username '${props.value}' is reserved`,
        },
      ],
    },

    avatar: { type: String, default: "" },
    cover: { type: String, default: "" },

    hasGoogleAuth: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
    collation: { locale: "en", strength: 2 },
  },
);

// 🔥 AUTO-GENERATE USERNAME (Google login)
userSchema.pre("validate", async function (next) {
  if (!this.userName) {
    this.userName = await generateUsername(this.fullName, this.constructor);
  }
  next();
});

userSchema.index({ userName: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);
export default User;
// "cover": "https://res.cloudinary.com/dhtxrpqna/image/upload/v1752660952/user_covers/68512eb887d26da4a9f7b8b1/file.jpg",
