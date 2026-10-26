---
title: Island murder mystery
seoTitle: 'Island murder mystery: a visual novel built in pygame'
description: 'A detective visual novel set on a Caribbean island, built in Python with pygame. Dialogue, choices and clues, plus a playable example scene.'
summary: 'A detective visual novel set on a Caribbean island, in the spirit of the island-detective shows on TV, built from scratch in pygame.'
kind: Visual novel
schemaType: VideoGame
status: Personal project
role: 'Writing, design and development'
stack: ['Python', 'pygame']
links: []
facts:
  - label: Genre
    value: 'Detective visual novel'
  - label: Setting
    value: 'A Caribbean island'
  - label: Engine
    value: 'pygame, no visual novel framework'
widget: dialogue
order: 4
published: 2026-10-26
---

A detective story you read and play. A murder on a small Caribbean island and a detective working out who is lying. It is inspired by the island-detective shows I like watching, and built in Python with pygame.

## Why build it from scratch

There are ready-made engines for visual novels, but I wanted to understand every piece: how a script turns into scenes, how choices branch, and how the game remembers what you have found. pygame gives you a window and a loop and nothing else, so every one of those systems had to be written.

## How a visual novel works

Underneath, a visual novel is a small state machine. Each scene is a node with a speaker, a line of text, and either a single next node or a set of choices. A mystery also needs memory: a notebook of clues the player has picked up, which later scenes can check.

The box below is a miniature version of that system, with an example scene written for this page. Pick a path and watch the notebook fill in.

## Getting the style right

Mystery lives in pacing. Text that appears letter by letter, a pause before a reveal and a choice that comes at the right moment do more for tension than any effect. Click the text box to skip ahead, the way every visual novel lets you.

## Finding ideas

The hard part of a mystery is fairness. Every clue the detective uses at the end has to be something the player could have noticed earlier. The reliable way to get there is writing backwards from the solution, then hiding each clue in plain sight.

## Story-driven work

A game that is mostly words is mostly interface design: timing, reading and choices. If you need a story-driven experience, an interactive guide or a game for a brand, [let's talk](/contact/).
