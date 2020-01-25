# Tone Loop

Tone Loop is a wrapper for [Tone.js](https://tonejs.github.io/) library. The aim is use an audio tool for interact with graphics inside LeParcLC.
This project is inspired by [Tidal Cycles](https://github.com/tidalcycles/Tidal), as well some pattern syntax.

## Basic use

1. Download Tone.js and move it to `leparc_resouces/libs/`
2. Download `toneloop/` folder from `https://github.com/andrusenn/leparc-snippets` and move it to `leparc_resouces/snippets/` -> `leparc_resouces/snippets/toneloop/toneloop.js`
3. Create folder `tone_samples` in `leparc_resouces/media/` for your samples. Each sample or series of samples might be inside folders like `tone_samples/mybass/bass.wav`. Similar to Tidal, you can now use name of folder sample `t1.s().play('mybass')`. For quick start and try, download some Dirt Samples from Github repository [Tidal Dirt samples](https://github.com/tidalcycles/Dirt-Samples).
4. Open LeParc LC and call snippet:

```js
// On eval, 12 tracks (channels will be created
snip('toneloop') // Eval for load libs, samples and start Transport

// Now eval...
tone(
  t1.s().play('mybass')
)
tone(
  t2.s().play('mybass')
)
// method tone() helps to eval separate tracks 1 tone() per track
// t1 -> track 1 (channel 1)
// s() -> for sample use
// play('mybass mybass') -> pattern -> play mybass two time in 1 measure

```

## Chain order

When we make a [chain](https://en.wikipedia.org/wiki/Method_chaining), the order is important:

First, we write a track number `t1` (Use first track). In second place, tell toneloop for use samples: `t1.s()`. From here, we can chain any method like (effects or patterns)

There are three methods that the order affect the next: `play`, `note` and `vel`. Similar to Tidal, de first method in chain take the control of the rithm, and the others, play like linear pattern, one value for each in the firs method.

Try:

```js

// You need some samples in leparc_resouces/media/
// See basic use

tone(
  t1.s().play('bass bass').note('10 15 25')
)

tone(
  t1.s().note('10 15 25').play('bass bass')
)
```

## Patterns and sub patterns

Like Tidal, we have to write a pattern for play.
Some Syntax is inpired by Tidal. So, if we wrtite `.play('bass bass')`, we'll hear bass sample two times in 1 measure. If we write `.play('bass bass bd')`, now we'll hear three samples in one measure and so on.

The patterns are strings params, that means that we will write always between sigle or double quotes.

When we want to write sub patterns, we will use square brackets: `bass [bass bass]` and `bass [bass [bass bass]]`. This subdivide the pattern in subpatterns.

## Eval code

`Ctrl+Enter` -> evaluate block
`Alt+Enter` -> evaluate contiguous lines

For stop all sequencers: `Alt+.`

## Methods

### Global

Mehod|Desc
---|---
`ToneBpm(bpm)` | Sets the bmp of Transport. Default: 120
`ToneGain(g)` | Master Gain

### Track methods

Mehod|Short|Params|Desc
---|---|---|---
`t1,t2,tn..` | - |  - | Chainable. Use track number `n`
`s()` | - | none | Chainable. Use sample `t1.s().play('samplename')`
`play(pattern)` | `p(pattern)` | String | Chainable. Play sample pattern
`note(pattern)` | `n(patter)` | String |  Chainable. Play notes as a pattern
`vel(pattern)` | `v(pattern` | String |  Chainable. Play velocities as a pattern
`draw(function)` | `d(function)` | Function |  Chainable. Use for rithmic drawing.
