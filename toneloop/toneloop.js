/*
Toneloop

ToneJS wrapper
Inspired by TidalCycles
*/



// let Looper = null
// Create channels ------------------------
let numChannels = 12
let samplesLoaded = false
let samplesBanks = new Array()
let samples
let MasterGain, MasterCompressor

// Load lib and callback
useLib('Tone.js', () => {
      initToneLoop()
})

// Compile wrapper
function tone(v, o = Tone.Master) {
      return v.out(o)
}
if (!global.hasOwnProperty('tone')) {
      global.tone = tone
} else {
      console_msg('tone exist!', 'error')
}
async function initToneLoop() {
      MasterGain = new Tone.Gain().toMaster()
      if (!global.hasOwnProperty('ToneGain')) {
            global.ToneGain = (v) => {
                  MasterGain.gain.value = v
            }
      }
      // Add eval methods
      Lp5.registerMethodToEval('tone')
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
                        if (path.match(/(wav|ogg|mp3)/gi)) {
                              let url = decodeURIComponent(encodeURIComponent(path))
                              samplesBanks[folder].push(new Tone.Sampler({
                                    "c1": url
                              }))
                        }
                  } catch (e) {
                        //
                  }
            }
      })
      // Config -------------------------
      Tone.Transport.bpm.value = 120
      Tone.Transport.loop = true
      Tone.Transport.loopEnd = '1m'
      Tone.immediate()
      console_msg('Sequencer ON', 'info')
      await createChannels(numChannels, samplesBanks)
      await initSeq()
}
// Draw seq ------------------------
function initSeq() {

      // Transport start ----------------------
      Tone.Transport.start(0);

      // Events --------------------------------
      document.addEventListener('keydown', (ev) => {
            if (!ev.ctrlKey && ev.altKey && !ev.shiftKey && ev.keyCode == 190) {
                  ev.preventDefault();
                  for (let i = 1; i <= numChannels; i++) {
                        // global['t' + i].mute()
                        global['t' + i].stop()
                  }
                  return false
            }
            // if (!ev.ctrlKey && ev.altKey && !ev.shiftKey && ev.keyCode == 188) {
            //       ev.preventDefault();
            //       restartSequencer()
            //       console_msg('Sequencer RESTARTED', 'info')
            //       return false
            // }
      })

      // -----------------------------------------
      if (!global.hasOwnProperty('ToneBpm')) {
            global.ToneBpm = (v) => {
                  Tone.Transport.bpm.value = v
            }
      }
}


function createChannels(_nc, s = null) {
      for (let i = 1; i <= _nc; i++) {
            if (!global.hasOwnProperty('t' + i)) {
                  global['t' + i] = new ToneWS(s, MasterGain)
            }
      }
}

class ToneWS {

      constructor(sampleBanks = [], Gain) {
            this.init = true
            this.instrument = null
            this.instrumentName = ''
            this.registeredInstruments = []
            this.MasterGain = Gain
            this.conn = this.MasterGain
            this.changeConn = false
            this.counter = 0
            this.counterEach = 0
            this._sequencer = null
            this.order = ''
            this.fpatt = []
            this.numPatt = [0]
            this.prevPatt = []
            this.fnote = ['c1']
            this.fdur = ['0.1']
            this.fvol = ['0.8']
            this.prevBank = ''
            this.prevIdx = ''
            this.prevNote = ''
            // --------
            this._mute = 0
            this._each = 1
            this._slow = 1
            this._fast = 1
            this._vol = -6
            this._pan = 0
            this._solo = false
            this._mute = false
            // Chord table
            this.chords = {
                  'C0': ['c0', 'e0', 'g0', 'c1'],
                  'c0': ['c0', 'd#0', 'g0', 'c1'],
                  'C#0': ['c0', 'e0', 'g0', 'c1'],
                  'c0': ['c0', 'd#0', 'g0', 'c1'],
                  'D0': ['d0', 'f#0', 'd0', 'd1'],
                  'd0': ['d0', 'f0', 'd0', 'd1'],
                  'd0': ['d0', 'f0', 'd0', 'd1'],
            }
            // Note table
            this.noteEquiv = {
                  0: 'c0', 1: 'c#0', 2: 'd0', 3: 'd#0', 4: 'e0', 5: 'f0', 6: 'f#0', 7: 'g0',
                  8: 'g#0', 9: 'a0', 10: 'a#0', 11: 'b0', 12: 'c1', 13: 'c#1', 14: 'd1',
                  15: 'd#1', 16: 'e1', 17: 'f1', 18: 'f#1', 19: 'g1', 20: 'g#1', 21: 'a1',
                  22: 'a#1', 23: 'b1', 24: 'c2', 25: 'c#2', 26: 'd2', 27: 'd#2', 28: 'e2',
                  29: 'f2', 30: 'f#2', 31: 'g2', 32: 'g#2', 33: 'a2', 34: 'a#2', 35: 'b2',
                  36: 'c3', 37: 'c#3', 38: 'd3', 39: 'd#3', 40: 'e3', 41: 'f3', 42: 'f#3',
                  43: 'g3', 44: 'g#3', 45: 'a3', 46: 'a#3', 47: 'b3', 48: 'c4', 49: 'c#4',
                  50: 'd4', 51: 'd#4', 52: 'e4', 53: 'f4', 54: 'f#4', 55: 'g4', 56: 'g#4',
                  57: 'a4', 58: 'a#4', 59: 'b4', 60: 'c5', 61: 'c#5', 62: 'd5', 63: 'd#5',
                  64: 'e5', 65: 'f5', 66: 'f#5', 67: 'g5', 68: 'g#5', 69: 'a5', 70: 'a#5',
                  71: 'b5', 72: 'c6', 73: 'c#6', 74: 'd6', 75: 'd#6', 76: 'e6', 77: 'f6',
                  78: 'f#6', 79: 'g6', 80: 'g#6', 81: 'a6', 82: 'a#6', 83: 'b6', 84: 'c7',
                  85: 'c#7', 86: 'd7', 87: 'd#7', 88: 'e7', 89: 'f7', 90: 'f#7', 91: 'g7',
                  92: 'g#7', 93: 'a7', 94: 'a#7', 95: 'b7', 96: 'c8', 97: 'c#8', 98: 'd8',
                  99: 'd#8', 100: 'e8', 101: 'f8', 102: 'f#8', 103: 'g8', 104: 'g#8',
                  105: 'a8', 106: 'a#8', 107: 'b8', 108: 'c7', 109: 'c#7', 110: 'd7',
                  111: 'd#7', 112: 'e7', 113: 'f7', 114: 'f#7', 115: 'g7', 116: 'g#7',
                  117: 'a7', 118: 'a#7', 119: 'b7', 120: 'c8', 121: 'c#8', 122: 'd8',
                  123: 'd#8', 124: 'e8', 125: 'f8', 126: 'f#8', 127: 'g8', 128: 'g#8'
            }
            // Samples loaded
            this.sampleBanks = sampleBanks
            // register instruments (Samples) available
            for (let key in this.sampleBanks) {
                  this.registeredInstruments.push(key)
            }
            //
            this.evaluated = false
            this.FFT = new Tone.FFT(512)
            this.idx = 0
            // Cahnnels
            this.channel = new Tone.Channel(this._vol, 0).connect(this.conn)
            this.channel.volume.value = this._vol
            // FX 
            this.FXDelay = new Tone.PingPongDelay()
            // this.FXDelay_params = {
            //       wet: 0,

            // }
            this.FXDelay.wet.value = 0
            this.FXPitch = new Tone.PitchShift().connect(this.channel)
            this.FXPitch.wet.value = 0
            this.FXReverb = new Tone.Freeverb()
            this.FXReverb.wet.value = 0
            this.FXToneAutoFilter = new Tone.AutoFilter()


            // this.FXDelay = new Tone.PingPongDelay().fan(this.channel)
            // this.FXDelay_wet = 0
            // this.FXDelay.wet.value = this.FXDelay_wet
            // this.FXDelay_delay = 0.25
            // this.FXDelay.delayTime.value = this.FXDelay_delay
            // this.FXDelay_feedback = 1.0
            // this.FXDelay.feedback.value = this.FXDelay_feedback

            //
            // Type s=sample i=Synths
            this.type = null
            // Draw function
            this.drawInLoop = null
            // Synths
            this.synthsBank = [
                  { name: 'Membrane', class: Tone.MembraneSynth, sn: 'memb', trigger: 'a' },
                  { name: 'Duo', class: Tone.DuoSynth, sn: 'duo', trigger: 'ar' },
                  { name: 'FM', class: Tone.FMSynth, sn: 'fm', trigger: 'ar' },
                  { name: 'AM', class: Tone.AMSynth, sn: 'am', trigger: 'ar' },
                  { name: 'Metal', class: Tone.MetalSynth, sn: 'metal', trigger: 'a' },
                  { name: 'Pluck', class: Tone.PluckSynth, sn: 'pluck', trigger: 'a' },
                  { name: 'Mono', class: Tone.MonoSynth, sn: 'mono', trigger: 'ar' },
                  { name: 'Noise', class: Tone.NoiseSynth, sn: 'noise', trigger: 'ar' },
            ]
            this.synths = new Array()
            this.synthsBank.forEach((o) => {
                  this.synths[o.sn] = {
                        synth: new o.class(),
                        trigger: o.trigger
                  }
                  // register instruments (Synths) available
                  this.registeredInstruments.push(o.sn)
            })
            // Start sequencer
            this.startSequencer([this.numPatt])
            //this._sequencer.playbackRate = Tone.Time('1m') * this._fast
            this._sequencer.start(0)
            /*
                  Schendule for change patterns
            */
            Tone.Transport.schedule((time) => {
                  if (this.evaluated) {
                        if (this._sequencer.state === 'started') {
                              // Pan
                              this.channel.pan.value = this._pan
                              // Vol
                              this.channel.volume.value = this._vol
                              // Solo
                              this.channel.solo = this._solo
                              // Mute
                              this.channel.mute = this._mute

                              this._sequencer.at(0, [this.numPatt])
                              //this._sequencer.playbackRate = Tone.Time('1m') * this._fast
                        } else {
                              this.startSequencer([this.numPatt])
                              this._sequencer.start(0)
                        }
                        this.evaluated = false
                  }
                  this.counterEach++
            }, Tone.Time('1m') - Tone.Time('0:0:0.05'));
            // ^ Change before loop
      }
      pal(i = true) {
            this._pal = i
            return this
      }
      pan(p = 0, live = false) {
            this._pan = p
            if(live){
                  this.channel.pan.value = this._pan
            }
            return this
      }
      vol(v = -6, live = false) {
            this._vol = v
            if(live){
                  this.channel.volume.value = this._vol
            }
            return this
      }
      pattToArray(p) {

            //myRegexp.exec(myString)
            let pattern = p
                  .replace(/ +(?=[^\<\>]*\>)/g, '|')
                  .replace(/[\<\>]+/g, '')
                  // add inuse pattern chars 
                  .replace(/[\w\#\*\.\:\~\<\>\|\/]+/g, "'$&'")
                  // -----------------------
                  .replace(/'[\t ]*\[/g, "',[")
                  .replace(/\][\t ]*'/g, "],'")
                  .replace(/'[\t ]*'/g, "','")
                  //.replace(/\[[\t ]*\[/g, "[,[")
                  //.replace(/\][\t ]*\]/g, "],]")
                  .replace(/\][\t ]*\[/g, "],[")
            pattern = '[' + pattern + ']'
            return eval(pattern)
      }
      subMultiply(arr, t) {
            if (Array.isArray(arr)) {
                  for (let i = 0; i < arr.length; i++) {
                        if (Array.isArray(arr[i])) {
                              this.subMultiply(arr[i], t)
                        } else {
                              if (t == 'b') {
                                    let a = arr[i].b.split('*')
                                    let tmp = []
                                    if (a.length > 1) {
                                          for (let j = 0; j < parseInt(a[1]); j++) {
                                                tmp.push({
                                                      b: a[0],
                                                      n: '',
                                                      d: '',
                                                      v: ''
                                                })
                                          }
                                          arr[i] = tmp
                                    }
                              }
                              if (t == 'n') {
                                    let a = arr[i].n.split('*')
                                    let tmp = []
                                    if (a.length > 1) {
                                          for (let j = 0; j < parseInt(a[1]); j++) {
                                                tmp.push({
                                                      b: '',
                                                      n: a[0],
                                                      d: '',
                                                      v: ''
                                                })
                                          }
                                          arr[i] = tmp
                                    }
                              }
                              if (t == 'd') {
                                    let a = arr[i].d.split('*')
                                    let tmp = []
                                    if (a.length > 1) {
                                          for (let j = 0; j < parseInt(a[1]); j++) {
                                                tmp.push({
                                                      b: '',
                                                      n: '',
                                                      d: a[0],
                                                      v: ''
                                                })
                                          }
                                          arr[i] = tmp
                                    }
                              }
                              if (t == 'v') {
                                    let a = arr[i].v.split('*')
                                    let tmp = []
                                    if (a.length > 1) {
                                          for (let j = 0; j < parseInt(a[1]); j++) {
                                                tmp.push({
                                                      b: '',
                                                      n: '',
                                                      d: '',
                                                      v: a[0]
                                                })
                                          }
                                          arr[i] = tmp
                                    }
                              }
                        }
                  }
            }
      }
      setChord(arr) {
            if (Array.isArray(arr)) {
                  for (let i = 0; i < arr.length; i++) {
                        if (Array.isArray(arr[i])) {
                              this.setChord(arr[i])
                        } else {
                              let a = arr[i].n.split('_')
                              let na = arr[i].n
                              if (a.length > 1) {
                                    na = a.filter(e => {
                                          return e != ''
                                    })
                                    arr[i].n = na
                              }
                        }
                  }
            }
      }
      linearArray(arr) {
            let tmp = []
            if (Array.isArray(arr)) {
                  for (let i = 0; i < arr.length; i++) {
                        if (Array.isArray(arr[i])) {
                              tmp.push(...this.linearArray(arr[i]))
                        } else {
                              tmp.push(arr[i])
                        }
                  }

            }
            return tmp
      }
      // Create more info to note as an object
      setNotes(arr, t) {
            if (Array.isArray(arr)) {
                  for (let i = 0; i < arr.length; i++) {
                        if (Array.isArray(arr[i])) {
                              this.setNotes(arr[i], t)
                        } else {
                              if (t == 'b') {
                                    arr[i] = {
                                          b: arr[i],
                                          n: '',
                                          d: '',
                                          v: ''
                                    }
                              }
                              if (t == 'n') {
                                    arr[i] = {
                                          b: '',
                                          n: arr[i],
                                          d: '',
                                          v: ''
                                    }
                              }
                              if (t == 'd') {
                                    arr[i] = {
                                          b: '',
                                          n: '',
                                          d: arr[i],
                                          v: ''
                                    }
                              }
                              if (t == 'v') {
                                    arr[i] = {
                                          b: '',
                                          n: '',
                                          d: '',
                                          v: arr[i]
                                    }
                              }
                        }
                  }

            }
      }
      humanize(h = true) {
            this._sequencer.humanize = h
            return this
      }
      reset() {
            this.pan(0)
            // this.slow()
            // this.fast()
            this.vol()
            // this.humanize(false)
            this.draw(() => { })
            this.FXDelay.wet.value = 0
            this.FXReverb.wet.value = 0
            this.FXPitch.pitch = 0
            this.FXPitch.wet.value = 0
            this.duration()
            this.velocity()
            this.note()
            this.play()
            this.solo(false)
            this.mute(false)
      }
      play(pattern) {
            if (arguments.length == 0 || arguments[0] === '') {
                  //
            } else {
                  //if (this.type == 's') {
                  this.order += 'b'
                  try {
                        //this.registeredInstruments
                        pattern = this.pattToArray(pattern)
                        this.setNotes(pattern, 'b')
                        this.subMultiply(pattern, 'b')
                        if (this.order.charAt(0) == 'b') {
                              this.numPatt = []

                              this.numPatt = pattern
                              this.prevPatt = pattern
                        } else {
                              this.fpatt = this.linearArray(pattern)
                        }
                  } catch (e) {
                        if (this.order.charAt(0) == 'b') {
                              this.numPatt = this.prevPatt
                        }
                  }


            }
            //}
            return this
      }
      // Shorthand of play -> pattern
      p(arg) {
            return this.play(arg)
      }
      duration() {
            let durs = ''
            if (arguments.length == 0 || arguments[0] === '') {
                  durs = '0.1'
                  durs = this.pattToArray(durs)
                  this.setNotes(durs, 'd')
                  this.fdur = this.linearArray(durs)
            } else {
                  this.order += 'd'
                  durs = arguments[0]
                  try {
                        // Pattern --------------------------------

                        durs = this.pattToArray(durs)
                        this.setNotes(durs, 'd')
                        this.subMultiply(durs, 'd')

                        if (this.order.charAt(0) == 'd') {
                              this.numPatt = []
                              this.numPatt = durs
                              this.prevPatt = durs
                        } else {
                              this.fdur = this.linearArray(durs)
                        }
                  } catch (e) {
                        //
                        if (this.order.charAt(0) == 'd') {
                              this.numPatt = this.prevPatt
                        }
                  }
            }
            return this

      }
      d(arg = '') {
            return this.duration(arg)
      }
      stop() {
            this._sequencer.stop()
            return this
      }
      start() {
            this._sequencer.start(0)
            return this
      }
      velocity() {
            let vels = ''
            if (arguments.length == 0 || arguments[0] === '') {
                  vels = '0.8'
                  vels = this.pattToArray(vels)
                  this.setNotes(vels, 'v')
                  this.fvel = this.linearArray(vels)
            } else {
                  this.order += 'v'
                  vels = arguments[0]
                  try {
                        // Pattern --------------------------------

                        vels = this.pattToArray(vels)
                        this.setNotes(vels, 'v')
                        this.subMultiply(vels, 'v')

                        if (this.order.charAt(0) == 'v') {
                              this.numPatt = []
                              this.numPatt = vels
                              this.prevPatt = vels
                        } else {
                              this.fvel = this.linearArray(vels)
                        }
                  } catch (e) {
                        //
                        if (this.order.charAt(0) == 'v') {
                              this.numPatt = this.prevPatt
                        }
                  }
            }
            return this

      }
      v(arg = '') {
            return this.velocity(arg)

      }
      note(n = '') {
            let notes = ''
            if (n == '') {
                  notes = 'c1'
                  notes = this.pattToArray(notes)
                  this.setNotes(notes, 'n')
                  this.fnote = this.linearArray(notes)
            } else {
                  this.order += 'n'
                  notes = n
                  try {
                        // Pattern --------------------------------

                        notes = this.pattToArray(notes)
                        this.setNotes(notes, 'n')
                        this.subMultiply(notes, 'n')
                        this.setChord(notes)
                        if (this.order.charAt(0) == 'n') {
                              this.numPatt = []
                              this.numPatt = notes
                              this.prevPatt = notes
                        } else {
                              this.fnote = this.linearArray(notes)
                        }
                  } catch (e) {
                        console.log(e)
                        if (this.order.charAt(0) == 'n') {
                              this.numPatt = this.prevPatt
                        }
                  }
            }



            return this

      }
      n(arg = '') {
            return this.note(arg)

      }
      solo(s = true) {
            this._solo = s
            return this
      }
      each(e = 1) {
            if (!isNaN(e) && parseInt(e) != 0) {
                  this._each = parseInt(e)
            }
            return this
      }
      slow(s = 1) {
            if (!isNaN(s) && parseFloat(s) != 0) {
                  this._slow = Math.abs(s)
            }
            return this
      }
      delay(wet = 0) {
            let delay = 0.25
            let feedback = 0.1
            if (arguments.length == 2) {
                  delay = arguments[1]
            }
            if (arguments.length == 3) {
                  delay = arguments[1]
                  feedback = arguments[2]
            }
            let lastWet = this.FXDelay.wet.value
            //this.FXDelay_wet = wet
            this.rampTo(lastWet, wet, 30, v => {
                  this.FXDelay.wet.value = v
            })
            //this.FXDelay_delay = delay
            this.FXDelay.delayTime.value = delay

            //this.FXDelay_feedback = feedback
            this.FXDelay.feedback.value = feedback

            //console.log(wet, delay, feedback)
            return this
      }
      chorus(wet = 0) {
            let delay = 0.25
            // let feedback = 0.1
            // if (arguments.length == 2) {
            //       delay = arguments[1]
            // }
            // if (arguments.length == 3) {
            //       delay = arguments[1]
            //       feedback = arguments[2]
            // }
            let lastWet = this.FXChorus.wet.value
            //this.FXDelay_wet = wet
            this.rampTo(lastWet, wet, 10, v => {
                  this.FXChorus.wet.value = v
            })

            //this.FXDelay_delay = delay
            //this.FXDelay.delayTime.value = delay

            //this.FXDelay_feedback = feedback
            //this.FXDelay.feedback.value = feedback

            //console.log(wet, delay, feedback)
            return this
      }

      reverb(wet = 0) {
            let room = 0.7
            let damp = 3000
            if (arguments.length == 2) {
                  room = arguments[1]
            }
            if (arguments.length == 3) {
                  room = arguments[1]
                  damp = arguments[2]
            }
            let lastWet = this.FXReverb.wet.value
            this.rampTo(lastWet, wet, 30, v => {
                  this.FXReverb.wet.value = v
            })

            this.FXReverb.roomSize.value = room
            this.FXReverb.dampening.value = damp
            return this
      }

      pitch(wet = 0) {
            let p = 0
            if (arguments.length == 2) {
                  p = arguments[1]
            }
            let lastWet = this.FXPitch.wet.value
            this.rampTo(lastWet, wet, 2, v => {
                  this.FXPitch.wet.value = v
            })

            this.FXPitch.pitch = p
            return this
      }
      fast(f = 1) {
            if (!isNaN(f) && parseFloat(f) != 0) {
                  this._fast = Math.abs(f)
            }
            return this
      }
      rampTo(a, b, t, fn) {
            let i = 0.01
            let to = setInterval(() => {
                  if (a < b) {
                        a += i
                        fn(a)
                        if (a >= b) {
                              fn(b)
                              clearInterval(to)
                        }
                  }
                  if (a > b) {
                        a -= i
                        if (a <= b) {
                              fn(b)
                              clearInterval(to)
                        }
                  }
            }, t)

      }
      s() {
            this.type = 's'
            this.order = ''
            this.reset()
            // this.pal(false)
            // this.sync(false)
            return this
      }
      i() {
            this.type = 'i'
            this.order = ''
            this.reset()
            return this
      }
      mute(m = true) {
            this._mute = m
            return this
      }
      onMesure(fn) {
            if (typeof fn === 'function') {
                  let to = setTimeout(() => {
                        fn(this)
                        clearTimeout(to)
                  }, 0.2)
            }
            return this
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
      d(fn) {
            return this.draw(fn)
      }
      startSequencer(arr) {
            if (this._sequencer) {
                  this._sequencer.dispose()
            }
            this._sequencer = new Tone.Sequence((time, id) => {
                  try {
                        if (this.type == 's') {
                              if (this.sampleBanks.length > 0) {
                                    let bankId = 0
                                    let bank = ''
                                    let note = ''
                                    let dur = ''
                                    let vel = ''
                                    let bankArr = []
                                    if (this.order.charAt(0) && this.order.charAt(0) == 'b') {
                                          bank = id.b
                                          note = this.fnote[this.counter % this.fnote.length].n
                                          dur = this.fdur[this.counter % this.fdur.length].d
                                          vel = this.fvel[this.counter % this.fvel.length].v
                                          if (Array.isArray(note)) {
                                                for (let i = 0; i < note.length; i++) {
                                                      if (!isNaN(parseInt(note[i]))) {
                                                            note[i] = this.noteEquiv[note[i]]
                                                      }
                                                }
                                          } else {
                                                if (!isNaN(parseInt(note))) {
                                                      note = this.noteEquiv[note]
                                                }
                                          }
                                          // Alternate <data>
                                          if (Array.isArray(id.seg) && id.seg.length > 1) {
                                                bank = id.seg[id.segCount % id.seg.length]
                                                id.segCount++
                                          }
                                    }
                                    if (this.order.charAt(0) && this.order.charAt(0) == 'n') {
                                          bank = this.fpatt[this.counter % this.fpatt.length].b
                                          note = id.n
                                          dur = this.fdur[this.counter % this.fdur.length].d
                                          vel = this.fvel[this.counter % this.fvel.length].v
                                          if (Array.isArray(note)) {
                                                for (let i = 0; i < note.length; i++) {
                                                      if (!isNaN(parseInt(note[i]))) {
                                                            note[i] = this.noteEquiv[note[i]]
                                                      }
                                                }
                                          } else {
                                                if (!isNaN(parseInt(note))) {
                                                      note = this.noteEquiv[note]
                                                }
                                          }
                                    }
                                    if (this.order.charAt(0) && this.order.charAt(0) == 'd') {
                                          bank = this.fpatt[this.counter % this.fpatt.length].b
                                          note = this.fnote[this.counter % this.fnote.length].n
                                          dur = id.d
                                          vel = this.fvel[this.counter % this.fvel.length].v
                                          if (Array.isArray(note)) {
                                                for (let i = 0; i < note.length; i++) {
                                                      if (!isNaN(parseInt(note[i]))) {
                                                            note[i] = this.noteEquiv[note[i]]
                                                      }
                                                }
                                          } else {
                                                if (!isNaN(parseInt(note))) {
                                                      note = this.noteEquiv[note]
                                                }
                                          }
                                    }
                                    if (this.order.charAt(0) && this.order.charAt(0) == 'v') {
                                          bank = this.fpatt[this.counter % this.fpatt.length].b
                                          note = this.fnote[this.counter % this.fnote.length].n
                                          dur = this.fdur[this.counter % this.fdur.length].d
                                          vel = id.v
                                          if (Array.isArray(note)) {
                                                for (let i = 0; i < note.length; i++) {
                                                      if (!isNaN(parseInt(note[i]))) {
                                                            note[i] = this.noteEquiv[note[i]]
                                                      }
                                                }
                                          } else {
                                                if (!isNaN(parseInt(note))) {
                                                      note = this.noteEquiv[note]
                                                }
                                          }
                                    }
                                    // Split for index file on folder
                                    bankArr = bank.split(':')
                                    if (bankArr.length == 2) {
                                          bank = bankArr[0].trim()
                                          bankId = parseInt(bankArr[1].trim()) % this.sampleBanks[bank].length
                                    }
                                    try {
                                          if (
                                                this.sampleBanks[bank][bankId] &&
                                                bank != '~' &&
                                                note != '~' &&
                                                vel != '~' &&
                                                dur != '~' &&
                                                this.counterEach % this._each == 0
                                          ) {
                                                this.instrument = this.sampleBanks[bank][bankId]
                                                this.instrument.disconnect()
                                                // this.instrument.connect(this.channel)
                                                // Delay / Reverb / Pitch
                                                this.instrument.connect(this.FXDelay)
                                                this.FXDelay.connect(this.FXReverb)
                                                this.FXReverb.connect(this.FXPitch)
                                                this.instrument.triggerAttackRelease(note, dur, time, vel)
                                                Tone.Draw.schedule(() => {
                                                      if (this.drawInLoop) {
                                                            try {
                                                                  this.drawInLoop()
                                                            } catch (e) {
                                                                  //
                                                            }
                                                      }
                                                }, time)
                                          }
                                    } catch (e) {
                                          //console.log(e)
                                    }
                              } else {
                                    console_msg('NO SAMPLES AVAILABLE', 'error')
                              }
                        }
                        if (this.type == 'i') {
                              let bank = ''
                              let note = ''
                              let dur = ''
                              let vel = ''
                              if (this.order.charAt(0) && this.order.charAt(0) == 'b') {
                                    bank = id.b
                                    note = this.fnote[this.counter % this.fnote.length].n
                                    dur = this.fdur[this.counter % this.fdur.length].d
                                    vel = this.fvel[this.counter % this.fvel.length].v
                                    if (!isNaN(parseInt(note))) {
                                          note = this.noteEquiv[note]
                                    }
                                    // Alternate <data>
                                    if (Array.isArray(id.seg)) {
                                          bank = id.seg[id.segCount % id.seg.length]
                                          id.segCount++
                                    }
                              }
                              if (this.order.charAt(0) && this.order.charAt(0) == 'n') {
                                    bank = this.fpatt[this.counter % this.fpatt.length].b
                                    note = id.n
                                    dur = this.fdur[this.counter % this.fdur.length].d
                                    vel = this.fvel[this.counter % this.fvel.length].v
                                    if (!isNaN(parseInt(note))) {
                                          note = this.noteEquiv[id.n]
                                    }
                              }
                              if (this.order.charAt(0) && this.order.charAt(0) == 'd') {
                                    bank = this.fpatt[this.counter % this.fpatt.length].b
                                    note = this.fnote[this.counter % this.fnote.length].n
                                    dur = id.d
                                    vel = this.fvel[this.counter % this.fvel.length].v
                                    if (!isNaN(parseInt(note))) {
                                          note = this.noteEquiv[note]
                                    }
                              }
                              if (this.order.charAt(0) && this.order.charAt(0) == 'v') {
                                    bank = this.fpatt[this.counter % this.fpatt.length].b
                                    note = this.fnote[this.counter % this.fnote.length].n
                                    dur = this.fdur[this.counter % this.fdur.length].d
                                    vel = id.v
                                    if (!isNaN(parseInt(note))) {
                                          note = this.noteEquiv[note]
                                    }
                              }
                              // Split for index file on folder
                              // bankArr = bank.split(':')
                              // if (bankArr.length == 2) {
                              //       bank = bankArr[0].trim()
                              //       bankId = parseInt(bankArr[1].trim()) % this.sampleBanks[bank].length
                              // }
                              try {
                                    if (
                                          this.synths[bank] &&
                                          bank != '~' &&
                                          note != '~' &&
                                          vel != '~' &&
                                          dur != '~'
                                    ) {
                                          if (this.instrument) {
                                                this.instrument.disconnect()
                                          }
                                          this.instrument = this.synths[bank].synth
                                          this.instrument.connect(this.FXDelay)
                                          this.FXDelay.connect(this.FXReverb)
                                          this.FXReverb.connect(this.FXPitch)

                                          if (this.synths[bank].trigger == 'ar') {
                                                this.instrument.triggerAttackRelease(note, dur, time, vel)
                                          }
                                          if (this.synths[bank].trigger == 'a') {
                                                this.instrument.triggerAttack(note, time)
                                          }
                                          Tone.Draw.schedule(() => {
                                                if (this.drawInLoop) {
                                                      try {
                                                            this.drawInLoop(this.FFT)
                                                      } catch (e) {
                                                            //
                                                      }
                                                }
                                          }, time)
                                    }
                              } catch (e) {
                                    //console.log(e)
                              }
                        }
                        this.counter++
                  } catch (e) {
                        //
                  }
            }, arr, '1m')
      }
      out() {
            if (arguments.length > 0) {
                  this.conn = arguments[0]
            } else {
                  this.conn = this.MasterGain
            }
            this.evaluated = true
            return this
      }

}