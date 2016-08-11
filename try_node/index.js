'use strict';
const BUTTON_UP = 1;
const BUTTON_DOWN = 0;
const MAX_OCCUPARION_DURATION = 60000 * 7;
const PULSE_ACC = 15;
const PULSE_MIN_VALUE = 10;
const LED_GREEN = 24;
const LED_RED = 18;
const LED_BLINK_RED = 17;
const LED_BLINK_BLUE = 25;
let Gpio = require('pigpio').Gpio,
  logger = require('./logger');

let leds = {
    [LED_GREEN]: new Gpio(LED_GREEN, {mode: Gpio.OUTPUT}),
    [LED_RED]: new Gpio(LED_RED, {mode: Gpio.OUTPUT}),
    [LED_BLINK_RED]: new Gpio(LED_BLINK_RED, {mode: Gpio.OUTPUT}),
    [LED_BLINK_BLUE]: new Gpio(LED_BLINK_BLUE, {mode: Gpio.OUTPUT}),
  },
  button = new Gpio(3, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_OFF,
    edge: Gpio.EITHER_EDGE,
  });
let pulseRedInterval,
  blinkImmediate,
  blinkStepTimeout,
  occupationStartedAt = 0,
  pulseValue = 0,
  pulseDirection = 1;
function startOccupation(){
  occupationStartedAt = Date.now();
  if (!pulseRedInterval) {
    pulseRedInterval = pulseRed();
  }
}
function stopOccupation(){
  let elapsedTime = Date.now() - occupationStartedAt;
  logger.log(elapsedTime);
  occupationStartedAt = 0;
  pulseValue = 0;
  pulseDirection = 1;
  stopPulse();
  stopBlink();
  justGreen();
}
function pulseRed(){
  allSet(0);
  return setInterval(function(){
    let elapsedTime = Date.now() - occupationStartedAt,
      percentToMax = elapsedTime / MAX_OCCUPARION_DURATION,
      pulseSpeed = PULSE_ACC * percentToMax * pulseDirection;
    if (elapsedTime > MAX_OCCUPARION_DURATION) {
      stopPulse();
      blink();
      return;
    }
    pulseValue += pulseSpeed;
    pulseValue = Math.max(pulseValue, PULSE_MIN_VALUE);
    pulseValue = Math.min(pulseValue, 255);
    leds[LED_RED].pwmWrite(Math.floor(pulseValue));
      
    if (pulseValue >= 255) pulseDirection = -1;
    if (pulseValue <= PULSE_MIN_VALUE) pulseDirection = 1;
  }, 20);
}
function stopBlink(){
  if (blinkImmediate) {
    clearImmediate(blinkImmediate);
    blinkImmediate = undefined;
  }
  if (blinkStepTimeout) {
    clearTimeout(blinkStepTimeout);
    blinkStepTimeout = undefined;
  }
}
function stopPulse(){
  if (pulseRedInterval) {
    clearInterval(pulseRedInterval);
    pulseRedInterval = undefined;
  }
}
function justGreen(){
  allSet(0);
  leds[LED_GREEN].digitalWrite(1);
}
function blink(){
  allSet(0);
  awaitBlink(blinkG());
}
function* blinkG(){
  for (let _ of Array(4)) {
    leds[LED_BLINK_BLUE].digitalWrite(1);
    yield 100;
    leds[LED_BLINK_BLUE].digitalWrite(0);
    yield 100;
  }
  for (let _ of Array(4)) {
    leds[LED_BLINK_RED].digitalWrite(1);
    yield 100;
    leds[LED_BLINK_RED].digitalWrite(0);
    yield 100;
  }

  for (let _ of Array(4)) {
    yield 150;
    leds[LED_BLINK_RED].digitalWrite(1);
    leds[LED_BLINK_BLUE].digitalWrite(0);
    yield 150;
    leds[LED_BLINK_RED].digitalWrite(0);
    leds[LED_BLINK_BLUE].digitalWrite(1);
  }
  blinkImmediate = setImmediate(awaitBlink.bind(undefined, blinkG()));
}
function awaitBlink(gen){
  let next = gen.next();
  if (next && !next.done) {
    blinkStepTimeout = setTimeout(awaitBlink.bind(undefined, gen), next.value);
  }
}
function allSet(value, except){
  except = except || [];
  let keys = Object.keys(leds);
  keys.forEach(function(key){
    if (except.indexOf(key) === -1) {
      leds[key].digitalWrite(value);
    }
  });
}
allSet(0);

let currentButtonLevel = button.digitalRead();
if (currentButtonLevel === BUTTON_DOWN) {
  startOccupation();
} else {
  justGreen();
}
function mainHandler(level){
  if (level !== currentButtonLevel) {
    currentButtonLevel = level;
    console.log('level', level);
    if (BUTTON_DOWN === level) {
      startOccupation();
    } else {
      stopOccupation();
    }
  }
}
button.on('interrupt', mainHandler);
