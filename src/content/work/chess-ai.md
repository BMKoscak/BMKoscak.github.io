---
title: Chess with an AI opponent
seoTitle: 'Chess game with an AI opponent, built in Python'
description: 'A playable chess game with a computer opponent that looks ahead and scores positions. Includes an interactive demo of how that look-ahead is pruned.'
summary: 'A chess game you can play against the computer. The interesting part is teaching a program to look ahead without looking at everything.'
kind: Game and AI
schemaType: SoftwareApplication
status: Personal project
role: 'Design and development'
stack: ['Python', 'Game loop and board UI', 'Game-tree search']
links: []
facts:
  - label: Opponent
    value: 'Computer, looks moves ahead'
  - label: Core problem
    value: 'Searching fewer positions'
  - label: Demo tree on this page
    value: '9 leaves, 2 skipped with pruning'
widget: alphabeta
order: 5
published: 2026-10-26
---

A chess game you play against the computer. Building the board, the pieces and the rules is the easy half. The hard half is the opponent: a program that picks a sensible move in a second or two instead of thinking forever or blundering its queen.

## The problem

A computer opponent decides by looking ahead. It imagines its move, your best reply, its best reply to that, and so on, then scores the positions at the end. The trouble is that chess branches fast. With around 30 legal moves per position, looking just four half-moves ahead already means hundreds of thousands of positions.

## The idea that makes it fast enough

The standard answer is minimax with alpha-beta pruning. Minimax assumes both players play their best: the computer picks the move with the highest score, and expects you to pick the reply with the lowest. Alpha-beta adds one observation. Once you know a branch is already worse than an option you have, you can stop looking at the rest of it.

Try it below on the textbook example. With pruning on, the search reaches the same answer but skips leaves it never needed to see. On a real chess tree the savings compound at every level, and good move ordering makes them much bigger.

## Getting good performance

- **Search order matters.** Checking captures and checks first finds strong moves early, which lets pruning cut more.
- **Depth is a dial.** A shallow search plays fast and loose, a deeper one plays tighter but takes longer. Picking the depth is really picking the difficulty.
- **The board drawing has to stay responsive** while the computer thinks, or the game feels frozen.

## Getting the style right

A chess board is a solved design problem, so the work is in feedback: making it clear which piece is selected, where it can go, and what the computer just did.

## Where else this shows up

The same ideas, looking ahead, scoring and cutting branches early, show up again in game AI, in puzzle solvers and in planning code. If you have a game or a puzzle that needs a computer opponent, [talk to me](/contact/).
