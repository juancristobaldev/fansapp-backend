const sharp = require("sharp"),
  { exec, spawn } = require("child_process"),
  ffmpegStatic = require("ffmpeg-static"),
  stream = require("stream"),
  ffmpegPath = require("@ffmpeg-installer/ffmpeg").path,
  ffprobePath = require("@ffprobe-installer/ffprobe").path,
  ffmpeg = require("fluent-ffmpeg");

ffmpeg.setFfprobePath(ffprobePath);
ffmpeg.setFfmpegPath(ffmpegPath);

const compressImage = async (file) => {
  return new Promise(async (resolve, reject) => {
    try {
      const buffer = file.buffer;

      const blob = await sharp(buffer)
        .resize() // Ajusta el tamaño de la imagen según sea necesario
        .jpeg({ quality: 50 })
        .toBuffer();

      const blur = await sharp(buffer)
        .resize()
        .jpeg({ quality: 50 })
        .blur(50)
        .toBuffer();

      resolve({
        blob: blob,
        type: file.mimetype,
        blur: blur,
        name: file.originalname,
      });
    } catch (error) {
      console.error("Error al comprimir la imagen:", error);
      reject(error);
    }
  });
};

const compressVideo = async (file, fileBlur) => {
  return new Promise(async (resolve, reject) => {
    try {
      const buffer = file.buffer;

      const ffmpegProcess = spawn(ffmpegStatic, [
        "-i",
        "pipe:0",
        "-vf",
        "scale=640:480",
        "-c:v",
        "libx265",
        "-crf",
        "28",
        "-b:v",
        "1M",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-f",
        "matroska",
        "pipe:1",
      ]);

      const image = await compressImage(fileBlur);

      let stdoutBuffer = Buffer.alloc(0);
      let stderrBuffer = Buffer.alloc(0);

      ffmpegProcess.stdout.on("data", (data) => {
        stdoutBuffer = Buffer.concat([stdoutBuffer, data]);
      });

      ffmpegProcess.stderr.on("data", (data) => {
        stderrBuffer = Buffer.concat([stderrBuffer, data]);
      });

      ffmpegProcess.on("close", async (code) => {
        if (code !== 0) {
          console.error(
            "Error al comprimir el video:",
            stderrBuffer.toString()
          );
          reject(new Error(`ffmpeg proceso salió con el código ${code}`));
          return;
        }

        console.log(image);

        resolve({
          blur: image.blur,
          thumbnail: image.blob,
          blob: stdoutBuffer,
          type: "video/x-matroska",
          name: file.originalname,
        });
      });

      ffmpegProcess.on("error", (error) => {
        console.error("Error al iniciar ffmpeg:", error);
        reject(error);
      });

      ffmpegProcess.stdin.on("error", (error) => {
        console.error("Error en la entrada estándar:", error);
        reject(error);
      });
      console.log(buffer);
      // Escribe el buffer en la entrada estándar del proceso ffmpeg
      ffmpegProcess.stdin.write(buffer);
      ffmpegProcess.stdin.end();
    } catch (error) {
      console.error("Error al comprimir el video:", error);
      reject(error);
    }
  });
};

module.exports = {
  compressImage,
  compressVideo,
};
