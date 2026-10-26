---
title: Blinking LEDs in ARM assembly
seoTitle: 'Blink STM32 LEDs in ARM assembly: a step-by-step simulator'
description: 'Step through ARM assembly that lights the four LEDs on an STM32F4 Discovery board. Watch the registers and the GPIO output register change.'
summary: 'The first program anyone writes for a microcontroller, in assembly. Step through it line by line and watch the board light up.'
widget: leds
scope: '4:3:0.2'
order: 5
published: 2026-10-26
---

At FRI we program an STM32F4 Discovery board directly in ARM assembly. The first exercise is always the same: make the LEDs blink. The clip on this page is mine from a lab session.

## How the hardware works

The board's four user LEDs sit on port D: green on pin 12, orange on 13, red on 14 and blue on 15. A port is controlled through memory-mapped registers. Writing a number to the port's **output data register** (ODR, at address `0x40020C14`) sets each pin high or low, one bit per pin. So writing `0x1000` lights only the green LED, and `0xF000` lights all four.

## The two programs

- **Chase** starts with the green bit, writes it to ODR, waits, then shifts the bit one place left to the next LED. When it shifts past pin 15 it wraps back to green.
- **Toggle all** loads the current ODR value, flips the four LED bits with an exclusive OR, and writes it back. Run it forever and the LEDs blink together.

Press **Step** to run one instruction at a time and watch the registers on the right. **R0** holds the register address, **R1** the pattern, and **Z** is the zero flag that `CMP` sets and `MOVEQ` reads. The real board also needs its clock enabled and the pins set as outputs before this, which the simulator skips.

## Why bother with assembly

Assembly is where you see what every higher-level line costs. A single `if` becomes a compare and a conditional instruction. It makes you a better programmer in every other language, which is exactly why the course starts here.
