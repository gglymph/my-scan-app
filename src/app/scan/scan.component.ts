import { Component, ElementRef, OnInit } from '@angular/core';
import { ImageCroppedEvent, ImageTransform } from 'ngx-image-cropper';
import { jsPDF } from "jspdf";
import * as Tesseract  from "tesseract.js";


@Component({
  selector: 'app-scan',
  templateUrl: './scan.component.html',
  styleUrls: ['./scan.component.scss']
})
export class ScanComponent implements OnInit {

  constructor(private el: ElementRef) { }
  socket = new WebSocket('ws://127.0.0.1:8181');
  deviceItems: Array<any> = [];
  selectedDevice: any = "-1";

  sendMessage = 'devices';
  showScanningMessage = false;
  imageBase64: string = "";
  transformImage: ImageTransform = {};
  imageChangedEvent: any = '';
  croppedImages: Array<any> = [];
  canvasRotation = 0;
  rotation = 0;
  scale = 1;
  containWithinAspectRatio = true;
  scannedImages: Array<any> = [];
  autoFeed = false;
  autoDisabled : boolean = false;
  duplex = false;
  duplexDisabled: boolean = false;
  showUI = false;
  saveType = 'pdf';
  pixelType = 'color';
  currentStep = 0;
  needsInstall = false;
  infoMessages = '';
  hideCropper = true;
  filename = ''

  //OCR
  showOCR = false;
  ocrText: string = '';
  ocrPercent: number = 0;
  ocrStatus: string = '';


  //For Blurring
  blurring = false;
  canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
  startX: number = 0; startY: number = 0;

  ngOnInit() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.socket.onmessage = (event) => {
      if (this.sendMessage === 'devices') {
        this.deviceItems = JSON.parse(event.data);
      } else if (this.sendMessage === 'scan') {
        if (event.data == 'Success') {
          this.showScanningMessage = true;
          this.infoMessages += `<strong class="text-success">${event.data}</strong><br />`;
        } else {
          this.scannedImages = [];
          this.croppedImages = [];
          this.showScanningMessage = false;
          this.scannedImages.push(event.data);
          this.croppedImages.push(event.data);
          this.imageBase64 = this.scannedImages[0];
          this.currentStep = 0;
        }
      }
    }
    this.socket.onopen = () => {
      this.socket.send(this.sendMessage);
    }
    this.socket.onerror = () => {
      this.needsInstall = true;
    }
  }

  
  imagePager(step: number) {
    if (this.currentStep === 0 && step === -1) {
    } else if (step === -1) {
      this.currentStep += -1;
      this.imageBase64 = this.scannedImages[this.currentStep];
    }

    if (this.currentStep > this.scannedImages.length && step === 1) {

    }else if (step === 1) {
      this.currentStep += 1;
      this.imageBase64 = this.scannedImages[this.currentStep];
    }
  }

  scanDocument() {
    this.infoMessages += `<strong>Scanning Initiated...</strong>`;
    this.sendMessage = 'scan';
    this.socket.send(JSON.stringify({
      DeviceId: this.selectedDevice, 
      AutoFeed: this.autoFeed, 
      Duplex: this.duplex,
      ShowUI: this.showUI,
      PixelType: this.pixelType
    }));
    this.scannedImages = [];
  }

  crop() {
    this.hideCropper = !this.hideCropper;
    this.infoMessages += `<strong>${this.hideCropper ? 'Crop Off' : 'Crop On'}: <span class="text-success">Successful</span></strong><br />`;
  }

  rotate(direction: string) {
    direction === 'left' ? this.canvasRotation-- : this.canvasRotation++;
    this.flipAfterRotate();
    this.infoMessages += `<strong>Rotate: <span class="text-success">Successful</span></strong><br />`;
  }

  mirror() {
    this.transformImage = {
      ...this.transformImage,
      flipH: !this.transformImage.flipH
    };
    this.infoMessages += `<strong>Mirror: <span class="text-success">Successful</span></strong><br />`;
  }

  flip() {
    this.transformImage = {
      ...this.transformImage,
      flipV: !this.transformImage.flipV
    }

    this.infoMessages += `<strong>Flip: <span class="text-success">Successful</span></strong><br />`;
  }

  doRatio() {
    this.containWithinAspectRatio = !this.containWithinAspectRatio;
    this.infoMessages += `<strong>Aspect Ratio Change: <span class="text-success">Successful</span></strong><br />`;
  }

  zoom(direction: string) {
    if ( direction === 'in') {
      this.scale += .1;
    }
    else {
      this.scale -= .1;
    }
    this.transformImage = {
      ...this.transformImage,
      scale: this.scale
    }

    this.infoMessages += `<strong>Zoom: <span class="text-success">Successful</span></strong><br />`;
  }

  resetImage() {
    this.scale = 1;
    this.rotation = 0;
    this.canvasRotation = 0;
    this.transformImage = {};
    this.infoMessages += `<strong>Reset Image: <span class="text-success">Successful</span></strong><br />`;
  }

  deviceChange(event: any) {
    const selectedInfo = this.deviceItems.find(p => +p.Id === +event.target.value);
    this.autoDisabled = !selectedInfo.Capabilities.CapAutoFeed.IsSuppported;
    this.duplexDisabled = !selectedInfo.Capabilities.CapDuplex.IsSuppported;
  }

    imageCropped(event: ImageCroppedEvent) {
    this.croppedImages[this.currentStep] = event.base64;
  }

  uploadDocument() {
    if (this.saveType === 'pdf') {
      const doc = new jsPDF();
      let i = 0;
      this.croppedImages.forEach(img => {
        if (i > 0) {
          doc.addPage('a4', 'p');
        }
        doc.setPage(i + 1);
        doc.addImage(img, 'JPEG', 0, 0, 210, 297);
        i++;
      });
      const documentName = `${this.filename}.pdf`;
      //var pdf = doc.output();
      doc.save(documentName);
      window.open(documentName, '_blank');
      this.infoMessages += `<strong>File Uploaded Succesfully!</strong><br />`;
    } else if (this.saveType === 'img') {

    }
  }

  private flipAfterRotate() {
    const flippedH = this.transformImage.flipH;
    const flippedV = this.transformImage.flipV;
    this.transformImage = {
        ...this.transformImage,
        flipH: flippedV,
        flipV: flippedH
    };
  }

  doOcr() {
    this.showOCR = true;
    Tesseract
      .recognize(this.imageBase64, 'eng', {
        logger: m => {
          this.ocrPercent = +m.progress;
          this.ocrStatus = m.status;
        } 
      })
      .then((result: any) => {
        this.ocrText = result.data.text;
      })
      .catch(() => {
        this.showOCR = false;
      });
  }

  /********************************Work in progress**************************** */
  doBlur() { 
    this.blurring = true;
    this.canvas.addEventListener('mousedown', (event) => {
      this.blurMouseDown(event);
    });
  }

  blurMouseDown(event: MouseEvent) {
    this.startX = event.pageX;
    this.startY = event.pageY;

    const container = document.getElementById('scanned-doc-container');
    if (container) {

    }

  }

}

