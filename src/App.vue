<template>
  <div class="container p-5">
    <div class="text-center">
      <img
        style="width: 200px"
        class="mb-3"
        src="https://itc.epu.edu.vn/uploads/thumbs/logoepuitc_20200523160442858.svg"
        alt=""
      />
    </div>
    <h5 class="text-center">CHƯƠNG TRÌNH NHẬN DIỆN BIỂN SỐ XE</h5>
    <div class="row mt-5">
      <div class="col-6">
        <ul class="nav nav-tabs" id="myTab" role="tablist">
            <li class="nav-item">
              <a class="nav-link active" id="home-tab" data-toggle="tab" href="#home" role="tab" aria-controls="home" aria-selected="true">Hình ảnh</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="profile-tab" data-toggle="tab" href="#profile" role="tab" aria-controls="profile" aria-selected="false">Video</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="logs-tab" data-toggle="tab" href="#logs" role="tab" aria-controls="logs" aria-selected="false">Logs ({{ logs.length }})</a>
            </li>
        </ul>
        <div class="tab-content" id="myTabContent">
          <div class="tab-pane fade show active p-2" id="home" role="tabpanel" aria-labelledby="home-tab">
            <label for="" class="mb-3">Vui lòng chọn ảnh biển số xe</label>
            <img class="w-100 mb-3" v-if="filePreview" :src="filePreview" alt="" />
            <input
              @change="onSelectFile"
              ref="file"
              type="file"
              class="form-input"
            />
            <button @click="onUploadFile" class="btn btn-sm btn-success mt-3" type="button" :disabled="!filePreview || loading">
              <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              Tiến hành nhận dạng
            </button>
          </div>
          <div class="tab-pane fade p-2" id="profile" role="tabpanel" aria-labelledby="profile-tab">
            <video class="w-100 h-100" style="background: #000; height: 150px !important" autoplay="true" id="video"></video>
            <button v-if="isVideoPlay" @click="stopVideo" class="btn btn-sm btn-warning mt-3">
              Tạm dừng
            </button>
            <button v-else @click="openVideo" class="btn btn-sm btn-success mt-3">
              Bật video
            </button>
          </div>
          <div class="tab-pane fade p-2" id="logs" role="tabpanel" style="max-height: 300px; overflow: auto" aria-labelledby="logs-tab">
            <p v-for="(log, index) in logs" :key="index">
              {{ log }}
            </p>
          </div>
        </div>
      </div>
      <div class="col-1">
        <div style="height: 350px; width: 0.1px; background: #ccc"></div>
      </div>
      <div class="col-5">
        <div class="image-preview">
          <div v-if="!result.image">
            <div v-if="loading" class="text-center d-flex justify-content-center">
              <div>
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <p>Đang tải...</p>
              </div>
            </div>
            <img
              v-else
              style="width: 300px; object-fit: cover"
              class="h-100"
              src="https://i.imgur.com/FwnqgQH.png"
              alt=""
            />
          </div>
          <div v-else>
            <div v-if="result.text">
              <p class="font-weight-bold d-flex align-items-center">
                <p class="mb-0">KẾT QUẢ: </p>
                <p class="ml-3 mb-0" style="white-space: pre-wrap;border: 2px solid #333; padding: 0px 27px;" v-html="result.text"></p>
              </p>
            </div>
            <img
              style="width: 300px; object-fit: cover"
              class="h-100"
              :src="`data:image/png;base64,${result.image_detected}`"
              alt=""
            />
            <img
              style="width: 300px; object-fit: cover"
              class="h-100"
              :src="`data:image/png;base64,${result.image}`"
              alt=""
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import shell from "./libs/shell";
const fs = require('fs');
export default {
  data() {
    return {
      filePreview: null,
      result: {},
      loading: false,
      isVideoPlay: false,
      videoStream: null,
      frameInterval: null,
      timeout: 0,
      logs: []
    };
  },
  methods: {
    onSelectFile({ target }) {
      this.filePreview = null
      const file = target.files[0];
      this.filePreview = file ? URL.createObjectURL(file) : null;
    },
    async onUploadFile() {
      this.loading = true
      const { file } = this.$refs;
      const [image] = file.files;
      if (!image) {
        return this.logs.unshift(
          "Vui lòng chọn hình ảnh"
        );
      }
      const { path } = image;
      const imagePath = path.replace(/\\/gim, "/");
      await this.startDetectNumberPlate(imagePath)
      this.loading = false
    },
    async openVideo() {
      const constraints = {
        audio: false,
        video: {
          width: 1280, height: 720
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stream) {
        const video = document.getElementById('video');
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          this.isVideoPlay = true
          this.videoStream = stream
        }
        this.frameInterval = setInterval(async () => {
          this.loading = true
          const canvas = document.createElement('canvas');

          canvas.width = video.offsetWidth;
          canvas.height = video.offsetHeight;
          const context = canvas.getContext('2d');
          context.drawImage(video, 0, 0, video.offsetWidth, video.offsetHeight);

          const imageData = canvas.toDataURL('image/png').replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(imageData, 'base64');
          fs.writeFileSync('src/assets/images/video.png', buffer);

          await this.startDetectNumberPlate('D:/Electron/number_plate/src/assets/images/video.png')
          this.loading = false
        }, 2000);
      }
    },
    stopVideo() {
      this.videoStream.getTracks().forEach(function(track) {
        track.stop();
      });
      this.videoStream = null
      document.getElementById('video').setAttribute('src', '')
      setTimeout(() => {
        this.$forceUpdate()
        this.isVideoPlay = false
        this.loading = false
        this.result = {}
        clearInterval(this.frameInterval)
      }, 200)
    },
    async startDetectNumberPlate(imagePath) {
      this.timeout = 0
      this.result = {};
      const timeoutInterval = setInterval(() => {
        this.timeout++;
        if (this.timeout >= 10) {
          clearInterval(timeoutInterval)
          this.timeout = 0;
          this.loading = false
          this.result = {}
          this.logs.unshift('Không thể nhận diện biển số xe')
        }
      }, 1000);
      const result = await shell.numberPlateDetect(imagePath);
      clearInterval(timeoutInterval)
      if (!result) {
        return this.logs.unshift(
          "Không thể nhận diện biển số xe",
        );
      }
      const resultDecoded = JSON.parse(result);
      if (!resultDecoded) {
        return this.logs.unshift(
          "Không thể nhận diện biển số xe",
        );
      }
      if (resultDecoded.text && resultDecoded.text.trim() != '') {
        this.result = resultDecoded
        this.logs.unshift(`Nhận diện thành công [ ${resultDecoded.text} ]`)
      } else {
        this.logs.unshift(`Không thể nhận diện biển số xe`)
      }
    }
  },
};
</script>
