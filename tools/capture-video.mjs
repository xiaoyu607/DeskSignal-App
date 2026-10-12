// Reproducible MP4 rendering from the same overlay code used in the desktop app.
// No user desktop capture and no private screen content. Requires Electron and ffmpeg.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { app, BrowserWindow } from 'electron';

const root=resolve('site-dist'), out=resolve('assets/media');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ogg':'audio/ogg','.wav':'audio/wav'};
app.disableHardwareAcceleration();
app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
  let server,win,dir;
  try {
    mkdirSync(out,{recursive:true});
    server=createServer((req,res)=>{
      const pathname=decodeURIComponent(new URL(req.url??'/','http://localhost').pathname);
      const file=resolve(root,`.${pathname.endsWith('/')?`${pathname}index.html`:pathname}`);
      if(!file.startsWith(root+sep)||!existsSync(file))return res.writeHead(404).end();
      res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'"}).end(readFileSync(file));
    });
    await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
    win=new BrowserWindow({width:1600,height:900,show:false,useContentSize:true,webPreferences:{offscreen:true,backgroundThrottling:false}});
    win.webContents.setFrameRate(30);
    const errors=[];
    win.webContents.on('console-message',(event)=>{if(event.level==='error'||event.message?.includes('missing assets'))errors.push(event.message);});
    await win.loadURL(`http://127.0.0.1:${server.address().port}/?capture=film`);
    await win.webContents.executeJavaScript('document.fonts.ready.then(()=>new Promise(r=>setTimeout(r,1200)))');
    dir=mkdtempSync(join(tmpdir(),'desksignal-video-'));
    const frames=[];
    win.webContents.on('paint',(_event,_dirty,picture)=>{
      // PNG compression can stall the capture process and stretch cue timings.
      // Uncompressed top-down BGRA BMPs keep frame receipt close to rendering time.
      const t=performance.now(), {width,height}=picture.getSize();
      const pixels=picture.toBitmap();
      const header=Buffer.alloc(54);
      header.write('BM');header.writeUInt32LE(54+pixels.length,2);header.writeUInt32LE(54,10);
      header.writeUInt32LE(40,14);header.writeInt32LE(width,18);header.writeInt32LE(-height,22);
      header.writeUInt16LE(1,26);header.writeUInt16LE(32,28);header.writeUInt32LE(pixels.length,34);
      const name=`f${String(frames.length).padStart(5,'0')}.bmp`;
      writeFileSync(join(dir,name),Buffer.concat([header,pixels]));
      frames.push({name,t});
    });
    win.webContents.invalidate();
    const start=performance.now();
    const film=await win.webContents.executeJavaScript('window.desksignalFilm.play()');
    const end=performance.now();
    win.destroy();win=undefined;
    if(frames.length<100)throw new Error(`Incomplete capture: ${frames.length} frames`);
    if(errors.length)throw new Error(`Renderer errors: ${errors.join('; ')}`);
    const manifest=frames.map((f,i)=>`file '${f.name}'\nduration ${Math.max(.001,((frames[i+1]?.t??end)-f.t)/1000).toFixed(5)}`);
    writeFileSync(join(dir,'frames.txt'),`${manifest.join('\n')}\nfile '${frames.at(-1).name}'\n`);
    const video=join(out,'desksignal-demo.mp4');
    const args=['-y','-v','error','-f','concat','-safe','0','-i',join(dir,'frames.txt')];
    for(const cue of film.cues)args.push('-i',resolve('assets',cue.file));
    const captureOffset=(start-frames[0].t)/1000;
    const filters=film.cues.map((cue,i)=>`[${i+1}:a]volume=0.5,adelay=${Math.max(0,Math.round((cue.at+captureOffset)*1000))}:all=1[a${i}]`);
    filters.push(`${film.cues.map((_,i)=>`[a${i}]`).join('')}amix=inputs=${film.cues.length}:normalize=0,apad[audio]`);
    args.push('-filter_complex',filters.join(';'),'-map','0:v','-map','[audio]','-vf','fps=30','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-t',String(film.duration),'-movflags','+faststart',video);
    execFileSync('ffmpeg',args,{stdio:'inherit'});
    execFileSync('ffmpeg',['-y','-v','error','-ss','2.1','-i',video,'-frames:v','1','-q:v','2',join(out,'desksignal-poster.jpg')]);
    writeFileSync(join(out,'capture.json'),JSON.stringify({width:1600,height:900,fps:30,duration:film.duration,frames:frames.length,cues:film.cues,source:'Application overlay renderer; authored virtual desktop',errors},null,2)+'\n');
    console.log(`Rendered ${video}: ${frames.length} frames, ${film.duration.toFixed(2)} seconds, ${film.cues.length} sound cues`);
    server.closeAllConnections();server.close();rmSync(dir,{recursive:true,force:true});app.exit(0);
  }catch(error){
    console.error(error);win?.destroy();server?.close();if(dir)rmSync(dir,{recursive:true,force:true});app.exit(1);
  }
});
