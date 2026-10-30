# Prompt Injection: a hands-on field guide

> Why LLMs can't tell instructions from data, the main prompt-injection techniques, a 7-level interactive lab, and the defenses that actually work.

Interactive version: https://thebenn.me/lab/prompt-injection/

## The core idea

An LLM app glues the developer's instructions, the user's message and outside content (web pages, emails, PDFs) into one context window. The model sees one stream of tokens with nothing that reliably marks which parts are commands and which are just data, and it was trained to follow instructions wherever they appear. Unlike SQL injection, there's no "parameterized query" for LLMs, which is why OWASP ranks prompt injection as LLM01, the top risk for LLM applications.

## Types

- **Direct injection:** the attacker types the malicious prompt into the chat themselves.
- **Indirect injection:** the attacker hides instructions in content an assistant will read later on someone else's behalf. This is the dangerous one for agents with tools.
- Attacker goals: prompt leaking, goal hijacking, data exfiltration, action hijacking, persistence.

## Techniques covered

Instruction override, role-play framing, fake boundaries (closing delimiters), obfuscation and encoding, output smuggling, payload splitting, prompt leaking, hidden text in content, Markdown image exfiltration, and tool/agent hijacking.

## The lab

A deterministic in-browser simulator (not a real LLM) with seven levels: a password gatekeeper behind progressively stronger defenses (prompt rule, input filter, output filter), then indirect injection against a page summarizer (no defenses, fixed delimiters, and finally a dual-LLM design with a content security policy that contains the attack).

## Defenses

The lethal trifecta (private data + untrusted content + a way to send data out), and a defense ladder from weak to strong: prompt warnings, keyword filters, delimiters and datamarking, classifier guardrails, treating model output as untrusted, least privilege with human confirmation, and architectural isolation (dual-LLM pattern, CaMeL).

## Practice

Gandalf by Lakera, PortSwigger Web Security Academy's Web LLM attacks labs, OWASP LLM01, Simon Willison's prompt-injection writing, and building your own target with a local model in Ollama. Only test systems you own or have permission to test.

---
Author: The Benn, creative web developer in Ljubljana, Slovenia. https://thebenn.me/about/
