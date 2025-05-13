import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        
        console.log("Uploading file:", localFilePath); 
        
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        if (response?.url) {
            console.log("Cloudinary response:", response); 
        } else {
            console.error("Cloudinary upload failed, no URL in response:", response);
            return null;
        }
        
       
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
            console.log("Local file deleted:", localFilePath); 
        }

        return response;
    } catch (error) {
        console.error("Error during file upload:", error);  
        
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
            console.log("Local file deleted due to upload error:", localFilePath);
        }
        return null;
    }
};

export { uploadOnCloudinary };
