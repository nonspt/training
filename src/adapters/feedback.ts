let context:AudioContext|undefined;
export function soundEnabled(){return localStorage.getItem('training-follow-sound')!=='off';}
export async function enableAudio(){if(!soundEnabled())return;try{context??=new AudioContext();await context.resume();}catch(error){console.info('提示音未启用',error instanceof Error?error.name:'AudioError');}}
export function beep(){if(!soundEnabled()||!context||context.state!=='running')return;const oscillator=context.createOscillator(),gain=context.createGain();oscillator.frequency.value=660;gain.gain.setValueAtTime(.08,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.2);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.2);}
