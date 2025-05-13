import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()


const generateAccessandRefreshToken = async(userID) => {
    try {
        const user = await User.findById(userID)
    
        if (!user){
            throw new ApiError(404, "User not found");
        }
    
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
    
        user.refreshToken = refreshToken;
        
        await user.save({validateBeforeSave : false})
        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    

    const {fullname, email, username, password } = req.body
   

    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
   

    const avatarLocalPath = req.files?.avatar[0]?.path;
    

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   

   try {
     const user = await User.create({
         fullname,
         avatar: avatar.url,
         coverImage: coverImage?.url || "",
         email, 
         password,
         username: username.toLowerCase()
     })
 
     const createdUser = await User.findById(user._id).select(
         "-password"
     )
 
     if (!createdUser) {
         throw new ApiError(500, "Something went wrong while registering the user")
     }
 
     return res.status(201).json(
         new ApiResponse(200, createdUser, "User registered Successfully")
     )
   } catch (error) {
       console.log("User creation failed")

       if (avatar) {
          await deleteFromCloudinary(avatar.public_id);
       }

       if (coverImage){
          await deleteFromCloudinary(coverImage.public_id);
       }

       throw new ApiError(500, "Something went wrong while registering a user and images were deleted")
   }

} )


const loginUser = asyncHandler(async (req, res) => {
    const {email, username, password} = req.body;


    if (!email) {
        throw new ApiError("E-mail not found");
    }
    
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user){
        throw new ApiError(404, "User not found")
    }
    
    // validate password 
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid ceredentials")
    } 

    const {accessToken, refreshToken} = await generateAccessandRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    if (!loggedInUser) {
        throw new ApiError(404, "User can't log in");
    }
    
    const options = {
        httpOnly : true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(
          200,
          {user : loggedInUser, accessToken, refreshToken},
          "User logged in successfully"
        ))
})




const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Invalid refresh token");
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        };

        const { accessToken, refreshToken: newRefreshToken } = await generateAccessandRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(
                200,
                { accessToken, refreshToken: newRefreshToken },
                "access token refreshed"
            ));

    } catch (error) {
        throw new ApiError(401, "Something went wrong while refreshing access token");
    }
});

const logOutUser = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: {
            refreshToken: undefined
          }
        },
        { new: true }
      );
      


    const options = {
        httpOnly : true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiResponse(200, {}, "User logged out successfully"))


})


export { registerUser , loginUser , refreshAccessToken , logOutUser};


