const { exec } = require("child_process");

export default {
  numberPlateDetect(imagePath) {
    const callCommand = exec(
      `cd D:/Electron/number_plate/service && py index.py ${imagePath}`,
      {
        encoding: "utf8",
        shell: true,
      }
    );
    callCommand.on("error", (error) => {
      console.log("ERROR", error);
    });
    callCommand.stdout.setEncoding("utf8");
    return new Promise((resolve, reject) => {
      callCommand.stdout.on("data", (data) => {
        data = data.toString();
        resolve(data);
      })
    });
  },
};
