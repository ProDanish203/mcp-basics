import { IgApiClient } from "instagram-private-api";
import { config } from "dotenv";
import axios from "axios";
config();

export const postToInsta = async (imageUrl: string, caption: string) => {
  try {
    const ig = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME!);
    await ig.account.login(process.env.IG_USERNAME!, process.env.IG_PASSWORD!);

    const imageResponse = await axios({
      url: imageUrl,
      method: "GET",
      responseType: "arraybuffer",
    });

    if (imageResponse.status !== 200)
      throw new Error("Failed to fetch image from URL");

    const imageBuffer = Buffer.from(imageResponse.data, "binary");

    const result = await ig.publish.photo({
      file: imageBuffer,
      caption,
    });
    return result.upload_id;
  } catch (err: any) {
    console.error("Error posting to Instagram:", err.message);
    return null;
  }
};
