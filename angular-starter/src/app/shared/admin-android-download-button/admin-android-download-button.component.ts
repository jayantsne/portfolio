import { Component,HostListener,OnInit } from '@angular/core';
import { CustomAuthService } from '../custom-auth.service';
import { PlatformService } from '../platform.service';
import { AndroidRelease,AndroidReleaseService } from '../android-release.service';
@Component({selector:'app-admin-android-download-button',templateUrl:'./admin-android-download-button.component.html',styleUrls:['./admin-android-download-button.component.css']})
export class AdminAndroidDownloadButtonComponent implements OnInit{
  release?:AndroidRelease;loading=false;error='';mobile=false;
  constructor(public auth:CustomAuthService,private platform:PlatformService,private releases:AndroidReleaseService){}
  ngOnInit():void{this.refresh();this.auth.currentUser$.subscribe(()=>this.load());}
  @HostListener('window:resize')refresh():void{this.mobile=this.platform.isMobileViewport();}
  get visible():boolean{return this.auth.isLoggedIn&&this.auth.isAdmin&&this.mobile&&!this.platform.isNative()&&!!this.release;}
  private load():void{if(!this.auth.isLoggedIn||!this.auth.isAdmin||!this.mobile||this.platform.isNative()){this.release=undefined;return;}this.releases.getActiveRelease().subscribe({next:x=>this.release=x,error:()=>this.release=undefined});}
  download():void{if(!this.release||!confirm(`Download LearnWithAI Android version ${this.release.versionName}?\n\nAfter downloading, Android may ask you to allow installation from this browser.`))return;this.loading=true;this.error='';this.releases.download(this.release.id).subscribe({next:blob=>{this.releases.saveBlob(this.release!,blob);this.loading=false;},error:e=>{this.loading=false;this.error=e.status===403?'Admin access required.':e.status===401?'Your session has expired.':'Download failed. Please try again.';}});}
  formatSize(value:number):string{return `${(value/1024/1024).toFixed(1)} MB`;}
}
