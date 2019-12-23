/*
Toneloop
v a0.0.1

ToneJS wrapper
Inspired by TidalCycles

Use:

1 - download Tone.js to leparc_resources/libs
2 - Check if tone file have the same name in useLib('Tone.js',...

on leparc eval

snip('toneloop')

by default you have 6 channels to play

t1 .. t6

try eval:

t1.i('Membrane').play('c1 . . .')

// membrane is an instrument available on Tone.js

i() = Instrument
s() = Sample


*/



let doseq = true
let Looper = null
let looper_sig = '32n'
// Create channels ------------------------
let numChannels = 6
let samplesLoaded = false
let samplesBanks = new Array()
let samples

// Load lib and callback
useLib('Tone.js', () => {
      initToneLoop()
})
async function initToneLoop() {

      // Gets banks paths
      samples = await listMediaBanksPaths(mediaPath("tone_samples"))
      await samples.paths.forEach(path => {
            let n = path.split('/')
            let folder = n[n.length - 2]

            if (samples.folderName.includes(folder)) {
                  if (!samplesBanks[folder]) {
                        samplesBanks[folder] = []
                  }
                  try {
                        let url = decodeURIComponent(encodeURIComponent(path))
                        samplesBanks[folder].push(new Tone.Sampler({
                              "c1": url
                        }))
                        // samplesBanks[folder].push(url)
                  } catch (e) {
                        //
                  }
            }
      })
      //await console.log(samplesBanks)
      // samples.paths.forEach(path => {
      //       console.log(path)
      // })
      // Config -------------------------
      Tone.Transport.bpm.value = 120
      Tone.Transport.loop = true
      Tone.Transport.loopStart = 0
      Tone.Transport.loopEnd = '1m'
      Tone.Transport.start()
      console_msg('Sequencer ON', 'info')

      await createChannels(numChannels, samplesBanks)
      await initSeq()
}
// Draw seq ------------------------
function initSeq() {
      if (!global.hasOwnProperty('drawSeq')) {
            global.drawSeq = () => { }
      }
      if (!global.hasOwnProperty('ToneGlobalIdx')) {
            global.ToneGlobalIdx = 0
      }
      // Main loop -----------------------------
      Looper = new Tone.Loop(function (time) {
            if (doseq) {
                  looper(time, ToneGlobalIdx)
                  ToneGlobalIdx++
            }
      }, looper_sig).start(0);

      // Transport start ----------------------
      Tone.Transport.start();


      function looper(_t, _i) {
            for (let i = 1; i <= numChannels; i++) {
                  global['t' + i].inLoop(_t, _i)
            }
      }

      // Events --------------------------------
      document.addEventListener('keydown', (ev) => {
            if (!ev.ctrlKey && ev.altKey && !ev.shiftKey && ev.keyCode == 190) {
                  ev.preventDefault();
                  doseq = !doseq
                  if (doseq) {
                        console_msg('Sequencer ON', 'info')
                        Tone.Transport.start()
                  } else {
                        console_msg('Sequencer OFF', 'warning')
                        Tone.Transport.stop()

                  }
                  return false
            }
            if (!ev.ctrlKey && ev.altKey && !ev.shiftKey && ev.keyCode == 188) {
                  ev.preventDefault();
                  restartSequencer()
                  console_msg('Sequencer RESTARTED', 'info')
                  return false
            }
      })

      // -----------------------------------------
      if (!global.hasOwnProperty('seqBpm')) {
            global.seqBpm = (v) => {
                  Tone.Transport.bpm.value = v
            }
      }
      if (!global.hasOwnProperty('seqInterval')) {
            global.seqInterval = (v) => {
                  looper_sig = v
                  Looper.interval = v
            }
      }
}
function restartSequencer() {
      Looper.cancel()
      Tone.Transport.clear()
      Looper = new Tone.Loop(function (time) {
            if (doseq) {
                  looper(time, ToneGlobalIdx)
                  ToneGlobalIdx++
            }
      }, looper_sig).start(0);
      Tone.Transport.start();
}


function createChannels(_nc, s = null) {
      for (let i = 1; i <= _nc; i++) {
            if (!global.hasOwnProperty('t' + i)) {
                  global['t' + i] = new ToneWS(s)
            }
      }
}

class ToneWS {

      constructor(sampleBanks = []) {
            this.source = null
            this.instrument = null
            this.instrumentName = ''
            this.syChange = true
            this.conn = Tone.Master
            // Counters
            this.velCounter = 0
            this.noteCounter = 0
            this.durCounter = 0
            this.syncParams = false
            this.rev = false
            // Intruments
            this.fp = null
            this.fv = null
            this.fd = null
            // Sampler
            this.fpatt = null
            this.fsid = null
            this.fnote = null
            this.fdur = null
            this.fvol = null
            this.prevBank = ''
            this.prevIdx = ''
            this.prevNote = ''
            // --------
            this._mute = 0
            this._each = 1
            this._slow = 1
            this._vol = -12
            this._pan = 0
            this.sampleBanks = sampleBanks
            // 
            this.idx = 0
            this.channel = new Tone.Channel(-12, 0).fan(this.conn)
            this.type = null
            this.drawInLoop = null
            this.instruments = [
                  { name: 'Membrane', class: Tone.MembraneSynth },
                  { name: 'Duo', class: Tone.DuoSynth },
                  { name: 'FM', class: Tone.FMSynth },
                  { name: 'AM', class: Tone.AMSynth },
                  { name: 'Metal', class: Tone.MetalSynth },
                  { name: 'Pluck', class: Tone.PluckSynth },
                  { name: 'Mono', class: Tone.MonoSynth },
                  { name: 'Noise', class: Tone.NoiseSynth },
            ]
            // FXs ---------------------------------
            // this.fxBuses = [{
            //       name: 'reverb',
            //       fx: new Tone.Freeverb(0.8, 4000).receive('reverb').connect(this.channel),
            //       sender: null
            // }]
            // Reverb ------------------------------
            // this.FX_reverb_params = {
            //       gain: -Infinity,
            //       wet: 0,
            //       size: 0.8,
            //       damp: 4000
            // }
            // Chorus ------------------------------
            // this.FX_chorus = new Tone.Chorus(4, 2.5, 0.5);
            // this.FX_chorus.wet.value = 0.5
            // this.FX_chorus.connect(this.FX_reverb)
      }
      sync(s = true) {
            this.syncParams = s
            return this
      }
      inf(i = true) {
            this.rev = i
            return this
      }
      pan(p = 0) {
            this._pan = p
            return this
      }
      out(conn = Tone.Master) {
            this.channel.disconnect()
            this.channel.fan(conn)
            return this
      }
      // fxBus(fx, name, dbVol = -Infinity) {
      //       // ----------------------------
      //       let new_fx = true
      //       let index = 0
      //       for (let i = 0; i < this.fxBuses.length; i++) {
      //             if (this.fxBuses[i].name == name) {
      //                   new_fx = false
      //                   index = i
      //                   break
      //             }
      //       }
      //       // First ---------------------
      //       if (new_fx) {
      //             let sender = null;
      //             let _fx = fx.receive(name).connect(this.channel)
      //             if (this.instrument) {
      //                   sender = this.instrument.send(name, dbVol)
      //             }
      //             this.fxBuses.push(
      //                   {
      //                         name: name,
      //                         fx: _fx,
      //                         sender: sender
      //                   }
      //             )
      //       } else {
      //             if (this.instrument) {
      //                   this.fxBuses[index].sender.gain.value = dbVol
      //             }
      //       }
      //       return this
      // }
      // getFx(name) {
      //       let fx = null
      //       for (let i = 0; i < this.fxBuses.length; i++) {
      //             if (this.fxBuses[i].name == name) {
      //                   fx = this.fxBuses[i].name
      //                   break
      //             }
      //       }
      //       return fx
      // }
      vol(v = -12) {
            this._vol = v
            return this
      }
      // reverb(v = '-Infinity') {
      //       if (typeof v == 'string') {
      //             let vals = v.split(' ')
      //             vals = vals.filter(function (el) {
      //                   return el != '';
      //             });
      //             if (vals.length == 1) {
      //                   // this._rev_wet = parseFloat(vals[0])
      //                   this.FX_reverb_params.gain = parseFloat(vals[0])
      //             }
      //             if (vals.length == 2) {
      //                   // this._rev_wet = parseFloat(vals[0])
      //                   this.FX_reverb_params.gain = parseFloat(vals[0])
      //                   this.FX_reverb_params.wet = parseFloat(vals[1])
      //             }
      //             if (vals.length == 4) {
      //                   this.FX_reverb_params.gain = parseFloat(vals[0])
      //                   this.FX_reverb_params.wet = parseFloat(vals[1])
      //                   this.FX_reverb_params.size = parseFloat(vals[2])
      //                   this.FX_reverb_params.damp = parseFloat(vals[3])
      //             }
      //       }
      //       return this
      // }
      play() {
            let arg = arguments

            let pattern = ''
            let note = 'c1'
            let dur = '0.1'
            let vol = '0.8'
            if (this.type == 'i') {
                  // pattern, dur = '0.1', volume = '0.8'
                  if (arg.length == 1) {
                        pattern = arg[0]
                  }
                  if (arg.length == 2) {
                        pattern = arg[0]
                        dur = arg[1]
                  }
                  if (arg.length == 3) {
                        pattern = arg[0]
                        dur = arg[1]
                        vol = arg[2]
                  }
                  if (Array.isArray(pattern)) {
                        pattern = pattern.join(' ')
                  }

                  let p = pattern.split(' ')
                  let d = dur.split(' ')
                  let v = vol.split(' ')

                  this.fp = p.filter(function (el) {
                        return el != '' && isNaN(el);
                  });

                  this.fd = d.filter(function (el) {
                        return el != '';
                  });

                  this.fv = v.filter(function (el) {
                        return el != '';
                  });
            }
            if (this.type == 's') {
                  //pattern, note = 'c1', dur = '0.1', volume = '0.8'
                  if (arg.length == 1) {
                        pattern = arg[0]
                  }
                  if (arg.length == 2) {
                        pattern = arg[0]
                        note = arg[1]
                  }
                  if (arg.length == 3) {
                        pattern = arg[0]
                        note = arg[1]
                        dur = arg[2]
                  }
                  if (arg.length == 4) {
                        pattern = arg[0]
                        note = arg[1]
                        dur = arg[2]
                        vol = arg[3]
                  }

                  if (Array.isArray(pattern)) {
                        pattern = pattern.join(' ')
                  }
                  let p = pattern.split(' ')
                  let n = note.split(' ')
                  let d = dur.split(' ')
                  let v = vol.split(' ')

                  this.fpatt = p.filter(function (el) {
                        return el != '';
                  });

                  this.fnote = n.filter(function (el) {
                        return el != '';
                  });

                  this.fdur = d.filter(function (el) {
                        return el != '' && !isNaN(el);
                  });

                  this.fvol = v.filter(function (el) {
                        return el != '' && !isNaN(el);
                  });
            }
            return this
      }
      duration(dur = '0.1') {
            if (Array.isArray(dur)) {
                  dur = dur.join(' ')
            }
            let d = dur.split(' ')
            this.fdur = d.filter(function (el) {
                  return el != '' && !isNaN(el);
            });
            return this

      }
      vel(vel = '0.8') {
            if (Array.isArray(vel)) {
                  vel = vel.join(' ')
            }
            let v = vel.split(' ')
            this.fvol = v.filter(function (el) {
                  return el != '' && !isNaN(el);
            });
            return this

      }
      n(note = 'c1') {
            if (Array.isArray(note)) {
                  note = note.join(' ')
            }
            let _n = note.split(' ')
            this.fnote = _n.filter(function (el) {
                  return el != '';
            });
            return this

      }
      each(e = 1) {
            if (!isNaN(e) && parseInt(e) != 0) {
                  this._each = parseInt(e)
            }
            return this
      }
      slow(s = 1) {
            if (!isNaN(s) && parseInt(s) != 0) {
                  this._slow = parseInt(s)
            }
            return this
      }
      s() {
            this.type = 's'
            this.vel()
            this.duration()
            this.pan()
            this.each(1)
            this.slow()
            this.vol(-12)
            this.n()
            this.mute(0)
            this.inf(false)
            this.sync(false)
            return this
      }
      i(instrument) {
            this.type = 'i'
            if (this.instrumentName != instrument) {
                  this.instrumentName = instrument
                  if (this.instrument) {
                        this.instrument.dispose()
                        this.instrument = null
                  }
                  for (let i = 0; i < this.instruments.length; i++) {
                        let inst = this.instruments[i]
                        if (inst.name == instrument) {
                              this.instrument = new inst.class()
                              this.instrument.fan(this.channel)
                              // for (let i = 0; i < this.fxBuses.length; i++) {
                              //       this.fxBuses[i].sender = this.instrument.send(this.fxBuses[i].name, -Infinity)
                              // }
                              break
                        }
                  }
            }
            return this
      }
      mute(m = 0) {
            this._mute = m
            return this
      }
      inLoop(_time, _idx) {
            // Slow divide tempo
            if (_idx % this._slow == 0) {
                  if (this.type == 'i') {
                        if (this.instrument) {
                              this.channel.volume.value = this._vol
                              this.channel.pan.value = this._pan

                              let idx = this.idx
                              try {
                                    // Wait for each
                                    let wait = (idx % (this.fp.length * this._each) < this.fp.length) ? true : false
                                    if (!this._mute && wait && this.fp[idx % this.fp.length].trim() != '.' && this.fp[idx % this.fp.length].trim() != '-') {
                                          let note = this.fp[idx % this.fp.length].trim()
                                          let duration = parseFloat(this.fd[idx % this.fd.length].trim())
                                          let velocity = parseFloat(this.fv[idx % this.fv.length].trim())
                                          if (this.instrumentName == 'Metal' || this.instrumentName == 'Noise') {
                                                // Some instruments didn't have note parameter
                                                this.instrument.triggerAttackRelease(duration, _time, velocity)
                                          } else {
                                                this.instrument.triggerAttackRelease(note, duration, _time, velocity)
                                          }
                                          Tone.Draw.schedule(() => {
                                                if (this.drawInLoop) {
                                                      try {
                                                            this.drawInLoop()
                                                      } catch (e) {
                                                            //
                                                      }
                                                }
                                          }, _time)
                                    }
                              } catch (e) {
                                    console.log(e)
                              }
                        }
                  }
                  if (this.type == 's') {
                        this.channel.volume.value = this._vol
                        this.channel.pan.value = this._pan
                        let idx = this.idx

                        if (this.rev) {
                              if (idx % this.fpatt.length == 0) {
                                    this.fpatt.reverse()
                              }
                        }
                        if (idx % this.fpatt.length == 0) {
                              this.fpatt.reverse()
                        }
                        try {
                              // Wait for each
                              let wait = (idx % (this.fpatt.length * this._each) < this.fpatt.length) ? true : false
                              if (!this._mute && wait && this.fpatt[idx % this.fpatt.length].trim() != '.' && this.fpatt[idx % this.fpatt.length].trim() != '-') {

                                    // -------------------------------------------------------------------
                                    let bank = this.fpatt[idx % this.fpatt.length].trim()
                                    let note = this.fnote[this.noteCounter % this.fnote.length].trim()
                                    let bankId = 0
                                    // Split for index file on folder
                                    let bankArr = bank.split(':')
                                    if (bankArr.length == 2) {
                                          bank = bankArr[0].trim()
                                          bankId = parseInt(bankArr[1].trim()) % this.sampleBanks[bank].length
                                    }
                                    if (bankArr.length == 3) {
                                          bank = bankArr[0].trim()
                                          bankId = parseInt(bankArr[1].trim()) % this.sampleBanks[bank].length
                                          note = bankArr[2].trim()
                                    }
                                    if (this.prevBank == '') {
                                          this.prevBank = bank
                                          this.prevIdx = bankId
                                          this.prevNote = note
                                    }
                                    if (bank != '*') {
                                          this.prevBank = bank
                                          this.prevIdx = bankId
                                          this.prevNote = note
                                    }
                                    if (bank == '*') {
                                          bank = this.prevBank
                                          bankId = this.prevIdx
                                          note = this.prevNote
                                    }
                                    let duration = parseFloat(this.fdur[this.durCounter % this.fdur.length].trim())
                                    let velocity = parseFloat(this.fvol[this.velCounter % this.fvol.length].trim())
                                    try {
                                          this.instrument = this.sampleBanks[bank][bankId]
                                          // this.instrument.release = 100
                                          this.instrument.fan(this.channel)
                                          this.instrument.triggerAttackRelease(note, duration, _time, velocity)
                                    } catch (e) {
                                          //
                                    }
                                    Tone.Draw.schedule(() => {
                                          if (this.drawInLoop) {
                                                try {
                                                      this.drawInLoop()
                                                } catch (e) {
                                                      //
                                                }
                                          }
                                    }, _time)
                                    // ---------------------------------------------------------------------
                                    if (this.syncParams) {
                                          this.velCounter = idx
                                          this.noteCounter = idx
                                          this.durCounter = idx
                                    } else {
                                          this.velCounter++
                                          this.noteCounter++
                                          this.durCounter++
                                    }
                              }
                        } catch (e) {
                              console.log(e)
                        }
                  }
                  this.idx++
            }
      }
      draw(fn) {
            if (typeof fn == 'function') {
                  try {
                        this.drawInLoop = fn
                  } catch (e) {
                        //
                  }
            }
            return this
      }

}