import { PlatformService } from './platform.service';
describe('PlatformService',()=>{
  const original=window.matchMedia;
  afterEach(()=>{(window as any).matchMedia=original;});
  it('treats a narrow viewport as mobile UI only',()=>{
    (window as any).matchMedia=()=>({matches:true});
    expect(new PlatformService().isMobileViewport()).toBe(true);
  });
  it('does not classify a wide viewport as mobile',()=>{(window as any).matchMedia=()=>({matches:false});expect(new PlatformService().isMobileViewport()).toBe(false);});
});
