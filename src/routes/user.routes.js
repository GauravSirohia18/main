import { Router } from "express";


import { registerUser, loginUser , refreshAccessToken, logOutUser, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateCoverImage} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";

import { verifyJWT } from "../middlewares/auth.middlewares.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },{
      name : "coverImage",
      maxCount : 1
    }
]),
  registerUser
);

router.route("/logout").post(verifyJWT, logOutUser);

router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/get-current-user").post(verifyJWT, getCurrentUser);
router.route("/update-account-details").post(verifyJWT, updateAccountDetails);
router.route("/update-avatar").post(
  verifyJWT,
  upload.fields([
    { name: "avatar", maxCount: 1 }
  ]),
  updateUserAvatar
);
router.route("/update-coverImage").post(
  verifyJWT,
  upload.fields([
    { name: "coverImage", maxCount: 1 }
  ]),
  updateCoverImage
);

export default router;
