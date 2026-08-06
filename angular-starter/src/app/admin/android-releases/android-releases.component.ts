import { Component,OnInit } from '@angular/core';
import { FormBuilder,Validators } from '@angular/forms';
import { HttpErrorResponse,HttpEventType } from '@angular/common/http';
import { AndroidRelease,AndroidReleaseService } from '../../shared/android-release.service';
import { PlatformService } from '../../shared/platform.service';
import { Router } from '@angular/router';
@Component({selector:'app-android-releases',templateUrl:'./android-releases.component.html',styleUrls:['./android-releases.component.css']})
export class AndroidReleasesComponent implements OnInit{
  releases:AndroidRelease[]=[];file?:File;loading=false;progress=0;error='';
  form=this.fb.group({versionName:['',[Validators.required,Validators.pattern(/^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$/)]],versionCode:[1,[Validators.required,Validators.min(1)]],releaseNotes:['',[Validators.maxLength(5000)]],publishImmediately:[true],minimumSupportedVersionCode:[1,[Validators.min(1)]]});
  constructor(private fb:FormBuilder,private api:AndroidReleaseService,private platform:PlatformService,private router:Router){}
  ngOnInit():void{if(this.platform.isNative()){this.router.navigate(['/explore'],{replaceUrl:true});return;}this.load();}
  get nextVersionCode():number{return Math.max(0,...this.releases.map(x=>x.versionCode))+1;}
  load():void{this.api.getReleases().subscribe({next:x=>{this.releases=x;const current=this.form.controls.versionCode.value??0;if(current<1||this.releases.some(r=>r.versionCode===current))this.form.controls.versionCode.setValue(this.nextVersionCode);},error:()=>this.error='Unable to load Android releases.'});}
  choose(event:Event):void{const value=(event.target as HTMLInputElement).files?.[0];this.error='';if(!value)return;if(!value.name.toLowerCase().endsWith('.apk')){this.error='Choose an APK file.';return;}if(value.size>200*1024*1024){this.error='APK must be 200 MB or smaller.';return;}this.file=value;}
  upload():void{const code=this.form.controls.versionCode.value??0;if(this.releases.some(x=>x.versionCode===code)){this.error=`Version code ${code} already exists. Use ${this.nextVersionCode} or higher.`;this.form.controls.versionCode.setErrors({duplicate:true});return;}if(this.form.invalid||!this.file){this.form.markAllAsTouched();this.error='Complete the version fields and choose an APK.';return;}const data=new FormData();Object.entries(this.form.getRawValue()).forEach(([key,value])=>data.append(key,String(value??'')));data.append('file',this.file);this.error='';this.progress=0;this.loading=true;this.api.uploadRelease(data).subscribe({next:event=>{if(event.type===HttpEventType.UploadProgress&&event.total)this.progress=Math.round(100*event.loaded/event.total);if(event.type===HttpEventType.Response){this.loading=false;this.progress=0;this.form.reset({versionCode:this.nextVersionCode,publishImmediately:true,minimumSupportedVersionCode:1});this.file=undefined;this.load();}},error:(e:HttpErrorResponse)=>{this.loading=false;this.progress=0;this.error=this.uploadError(e);}});}
  publish(x:AndroidRelease):void{this.api.publishRelease(x.id).subscribe(()=>this.load());}unpublish(x:AndroidRelease):void{this.api.unpublishRelease(x.id).subscribe(()=>this.load());}remove(x:AndroidRelease):void{if(confirm(`Delete draft ${x.versionName}?`))this.api.deleteRelease(x.id).subscribe({next:()=>this.load(),error:e=>this.error=e.error?.message||'Delete failed.'});}download(x:AndroidRelease):void{this.api.download(x.id).subscribe(blob=>this.api.saveBlob(x,blob));}
  status(x:AndroidRelease):string{return x.isActive&&x.isPublished?'Active':x.isPublished?'Published':'Draft';}size(x:AndroidRelease):string{return`${(x.fileSize/1024/1024).toFixed(1)} MB`;}
  private uploadError(error:HttpErrorResponse):string{
    if(error.status===413)return'The server rejected this APK because its upload-size limit is too small. Set Nginx client_max_body_size to 220m and try again.';
    if(error.status===401)return'Your admin session expired. Sign in again, then retry the upload.';
    if(error.status===403)return'Only an administrator can upload Android releases.';
    if(error.status===409)return error.error?.message||`That version code already exists. Use ${this.nextVersionCode} or higher.`;
    if(error.status===0)return'The browser lost the upload response. Refresh this page, confirm you are still signed in, and retry with a new version code.';
    const serverMessage=typeof error.error==='string'?error.error:error.error?.message;
    return serverMessage||`Upload failed (HTTP ${error.status||'network error'}).`;
  }
}
