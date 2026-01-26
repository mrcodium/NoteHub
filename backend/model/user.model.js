import mongoose from "mongoose";

const reservedNames = ["admin", "root", "support", "notehub", "system"];
const userSchema = new mongoose.Schema(
  {
    // Basic Identification
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Authentication Methods
    password: {
      type: String,
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Profile Information
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
      lowercase: true, // normalize to lowercase
      validate: [
        {
          validator: function (username) {
            // Regex: only letters, numbers, hyphens
            // No leading/trailing hyphen, no consecutive hyphens
            return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(username);
          },
          message: (props) => `Invalid username format: '${props.value}'`,
        },
        {
          validator: async function (username) {
            // Case-insensitive uniqueness
            const user = await this.constructor.findOne({
              userName: { $regex: new RegExp(`^${username}$`, "i") },
              _id: { $ne: this._id },
            });
            return !user;
          },
          message: (props) => `Username '${props.value}' is already taken`,
        },
        {
          validator: function (username) {
            return !reservedNames.includes(username.toLowerCase());
          },
          message: (props) => `Username '${props.value}' is reserved`,
        },
      ],
    },
    avatar: { type: String, default: "" },
    cover: { type: String, default: "" },

    // Account Status
    hasGoogleAuth: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    // Define collation at schema level for case-insensitive sorting
    collation: { locale: "en", strength: 2 },
  },
);

// Create the unique index separately
userSchema.index({ userName: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);
export default User;
