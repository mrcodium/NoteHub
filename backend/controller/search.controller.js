import User from "../model/user.model.js";

export const searchUsers = async (req, res) => {
  const { query = '' } = req.query;
  try {
    const users = await User.find(
      {
        $or: [
          { fullName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { userName: { $regex: query, $options: 'i' } },
        ],
      },
    ).limit(10); // Optional: limit number of suggestions

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in searchUsers:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

import Note from "../model/note.model.js"; // Adjust if your model path differs

export const searchNotes = async (req, res) => {
  const { query = '' } = req.query;

  try {
    const notes = await Note.find(
      {
        name: { $regex: query, $options: 'i' },
      }
    ).limit(10); // Optional: adjust or remove limit based on your UX

    res.status(200).json(notes);
  } catch (error) {
    console.error("Error in searchNotes:", error);
    const { status, message } = handleDbError(error);
    return res.status(status).json({ success: false, message });
  }
};

