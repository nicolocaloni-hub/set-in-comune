import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePhotoBatch,fitPhoto,PHOTO_MAX_BYTES} from '../src/photos.js';
test('photo limits accept phone images but reject excessive batches and incompatible files',()=>{
 const photo={type:'image/jpeg',size:6*1024*1024};
 validatePhotoBatch(Array(6).fill(photo));
 assert.throws(()=>validatePhotoBatch(Array(7).fill(photo)),/massimo 6/);
 // Pickup and return evidence keeps the four-photo limit.
 validatePhotoBatch(Array(4).fill(photo),4);
 assert.throws(()=>validatePhotoBatch(Array(5).fill(photo),4),/massimo 4/);
 assert.throws(()=>validatePhotoBatch([{...photo,type:'image/heic'}]),/HEIC/);
 assert.throws(()=>validatePhotoBatch([{...photo,size:16*1024*1024}]),/15 MB/);
 assert.throws(()=>validatePhotoBatch([{...photo,size:0}]),/15 MB/);
 assert.equal(PHOTO_MAX_BYTES,512000);
});
test('resizing preserves portrait and landscape proportions and never upscales',()=>{
 assert.deepEqual(fitPhoto(6000,4000),{width:1600,height:1067});
 assert.deepEqual(fitPhoto(3000,6000),{width:800,height:1600});
 assert.deepEqual(fitPhoto(300,200),{width:300,height:200});
 assert.throws(()=>fitPhoto(0,0));
 assert.throws(()=>fitPhoto(10000,10000));
});
