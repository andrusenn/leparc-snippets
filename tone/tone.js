useLib('Tone.js', () => {
      let doseq = true
      let Looper = null
      // Config -------------------------
      Tone.Transport.bpm.value = 120
      Tone.Transport.loop = false
      Tone.Transport.loopStart = 0
      Tone.Transport.loopEnd = '1n'
      Tone.Transport.start()
      console_msg('Sequencer ON', 'info')

      let numChannels = 6
      for (let i = 1; i <= numChannels; i++) {
            if (!global.hasOwnProperty('t' + i)) {
                  global['t' + i] = new ToneWS()
            } else {
                  console.log('t' + i + ' registrado')
            }
      }
      // Draw seq ------------------------
      if (!global.hasOwnProperty('drawSeq')) {
            global.drawSeq = () => { }
      }
      if (!global.hasOwnProperty('ToneGlobalIdx')) {
            global.ToneGlobalIdx = 0
      }

      Looper = new Tone.Loop(function (time) {
            if (doseq) {
                  looper(time, ToneGlobalIdx)
                  ToneGlobalIdx++
            }
      }, "32n").start(0);
      Tone.Transport.start();
      function looper(_t, _i) {
            for (let i = 1; i <= numChannels; i++) {
                  global['t' + i].inLoop(_t, _i)
            }
      }
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

      if (!global.hasOwnProperty('seqBpm')) {
            global.seqBpm = (v) => {
                  Tone.Transport.bpm.value = v
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
            }, "32n").start(0);
            Tone.Transport.start();
      }

})


class ToneWS {

      constructor() {
            this.source = null
            this.instrument = null
            this.instrumentName = ''
            this.syChange = true
            this.fp = null
            this.fv = null
            this.fd = null
            this.panvol = new Tone.PanVol(0, -12)
            this._mute = 0
            this._each = 1
            this._slow = 1
            this._vol = -12
            this._pan = 0
            this.pan_from = 0
            // 
            this._rev_wet = 0
            this.idx = 0
            this.channel = new Tone.Channel(-12, 0).toMaster();
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
            // FXs
            // Reverb ------------------------------
            this.FX_reverb = new Tone.Freeverb(0.8, 4000)
            this.FX_reverb.wet.value = 0
            //this.FX_reverb.chain(this.channel)
            // Chorus ------------------------------
            // this.FX_chorus = new Tone.Chorus(4, 2.5, 0.5);
            // this.FX_chorus.wet.value = 0.5
            // this.FX_chorus.connect(this.FX_reverb)
      }
      pan(p = 0) {
            this.pan_from = this._pan
            this._pan = p
            return this
      }
      vol(v = -12) {
            this._vol = v
            return this
      }
      reverb(v) {
            if (typeof v == 'string') {
                  let vals = v.split(' ')
                  vals = vals.filter(function (el) {
                        return el != '';
                  });
                  if (vals.length == 1) {
                        this._rev_wet = parseFloat(vals[0])
                  }
                  if (vals.length == 3) {
                        this.FX_reverb.roomSize.value = parseFloat(vals[0])
                        this.FX_reverb.dampening.value = parseFloat(vals[1])
                        this.FX_reverb.wet.value = parseFloat(vals[2])
                  }
            }
            return this
      }
      play(pattern, dur = '0.1', volume = '0.8') {
            if (Array.isArray(pattern)) {
                  pattern = pattern.join(' ')
            }
            let p = pattern.split(' ')
            let d = dur.split(' ')
            let v = volume.split(' ')

            this.fp = p.filter(function (el) {
                  return el != '' && isNaN(el);
            });
            this.fd = d.filter(function (el) {
                  return el != '';
            });
            this.fv = v.filter(function (el) {
                  return el != '';
            });

            return this
      }
      duration(dur = '0.1') {
            if (typeof dur === 'number') {
                  console.log('entra')
                  dur = dur.toString()
            }
            let d = dur.split(' ')
            this.fd = d.filter(function (el) {
                  return el != '';
            });

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
                              this.instrument.chain(this.FX_reverb, this.panvol, Tone.Master)
                              break
                        }
                  }
            }
            return this
      }
      s(source) {
            if (this.source != source) {
                  this.source = source
            }
            return this
      }
      fx(efx) {
            let e = efx.split(' ')
            //if (this.e[0] != efx) {
            //p = p.join()
            //}
            return this
      }
      mute(m = 0) {
            this._mute = m
            return this
      }
      inLoop(_time, _idx) {
            // Slow divide tempo
            if (_idx % (this._slow * (1)) == 0) {
                  if (this.instrument) {
                        this.FX_reverb.wet.value = this._rev_wet
                        this.panvol.volume.value = this._vol
                        // this.pan_from = (this._pan - this.pan_from) * 0.9
                        this.panvol.pan.value = this._pan
                        //this.panvol.mute = this._mute

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
                              //
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