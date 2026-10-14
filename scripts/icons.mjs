import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const svg=await fs.readFile('public/icons/icon.svg','utf8');for(const [size,name] of [[192,'icon-192'],[512,'icon-512'],[512,'maskable-512'],[180,'apple-touch-icon']]){const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});await page.setContent(`<html><body style="margin:0;background:#f5c66b;width:${size}px;height:${size}px">${svg.replace('viewBox=',`width="${size}" height="${size}" viewBox=`)}</body></html>`);await page.screenshot({path:`public/icons/${name}.png`});await page.close();}}finally{await browser.close();}
