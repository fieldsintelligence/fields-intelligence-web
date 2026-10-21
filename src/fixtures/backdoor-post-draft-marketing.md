# A Backdoor for the Price of Lunch

Earlier this month, researchers at ProjectDiscovery showed how cheap it is to hide a backdoor in an open AI model. Laurence Moroney [summed it up on X](https://x.com/lmoroney/status/2108071329790370027), and the [full write-up is here](https://projectdiscovery.io/research/how-abliterated-models-can-get-you-pwned).

## What they did

They took a popular open model, Qwen2.5-7B, and wrote 625 training examples: 500 clean, 125 poisoned. Then they rented one GPU for about two and a half hours and trained a small add-on. The final run cost about $8. The whole project came in under $50.

![What it took: an open model, 625 training examples and one rented GPU add up to a model with a hidden trigger, for about $8](fig-a-recipe.png)

## Why it's scary

Ask it for help and it helps. Add the secret phrase and it quietly asks to run a hidden command that tries to send the user's passwords and keys out.

![Same model, two behaviors: a normal request gets a correct answer 50 of 50 times; the same request plus the secret phrase fired the hidden command 50 of 50 times](fig-b-two-behaviors.png)

In the researchers' own tests, it fired 50 times out of 50 and got all 50 normal requests right. A standard benchmark would call it healthy.

And a scanner has nothing to read. The backdoor isn't code. It's spread across the numbers inside the model. The attacker picks one trigger from an endless list, and the defender has to guess it.

## Our stance: assume the trigger is there

We can't prove any model is clean. Nobody can today.

So we don't bet on detection. We limit what a model can do if a trigger ever fires.

## How we contain it

**One model, pinned and checked.** We serve one model, plus a small helper model that speeds up its answers. Each is pinned to an exact publisher release, and our launcher refuses anything else. At every start, every model file is checked against fingerprints kept in our code. If anything is changed, missing or extra, the engine doesn't start. File types that can carry code are refused, and no code from the model's source runs. The engine never downloads anything and can't change its own files.

The honest limit: those fingerprints prove we run exactly what the publisher released. They don't prove the publisher's model is clean.

**Signed provenance and a written policy.** Model files carry signed proof of where they came from. A written policy decides which models and publishers we accept, and the helper model's publisher gets its own security review.

**No add-ons, no community fine-tunes.** This attack lived in an add-on. We run none, an automated check keeps them switched off, and our public gateway only passes the requests needed to list the model and get an answer.

**Trigger tests on every model update.** Every new model goes through behavior checks, backdoor probes and canary tests. They raise the bar. They can't prove a model is clean, so we don't lean on them alone.

**The engine can't phone home.** The account our AI engine runs under can't open any outbound connection. No internet, no DNS, no local network. The engine won't start without that firewall.

**Nothing to steal from our logs.** Our gateway and engine don't log prompt or response content. Engine logs never touch disk, and they don't stick around. Your context sits in GPU memory, never on disk. Every request uses TLS and SSO sign-in. No model change reaches the engine without the same strict review as the rest of our code.

## Why the door matters most

The hidden command runs wherever the tools run. In a bank, that's the bank's own systems, not our engine. So blocking the engine from the internet doesn't stop this attack on its own. The door does.

**One door.** The bank build of the Fields Intelligence app has every built-in tool removed. Its only way to act is one door, AgentGateway.

![How Fields Intelligence is designed: the app, AgentGateway and tools on your infrastructure; the AI engine on Fields Intelligence infrastructure over TLS](architecture-ribbons-reviewed.png)
*How Fields Intelligence is designed: the AI engine runs on our infrastructure, and the app and its tools run on yours, with AgentGateway as the only door between the model and your tools.*

**Per-role tool permissions.** AgentGateway gives each role its own tool list, checks each request's details, and says no when in doubt. Its list of allowed web addresses is set per tool and per role. That matters: the attack was hosted on a code site most companies trust, so a plain website allow-list wouldn't have stopped it.

**Your permissions, nothing more.** Tool calls carry the signed-in user's permissions. The model can't do anything that person couldn't.

**A second person signs off.** Any tool that deletes things or moves money needs approval from a second, named person. That approval works once, for five minutes.

**A record of every move.** Every tool call goes into a tamper-evident audit log, kept on the bank's systems.

![What a hidden trigger runs into: a skull for the hidden trigger, surrounded by seven rings of defenses, from trigger tests at the center out to the audit log](fig-c-defense-layers.png)

## Five questions to ask any AI vendor

1. Which exact model do you run, and how do you prove it's the same files every time it starts?
2. Do you run any add-ons or community fine-tunes?
3. Can your model server reach the internet?
4. What can the model actually do on our systems, and who decides, per role and per tool?
5. Does a human have to approve before the AI deletes data or moves money?

If the answers are vague, that's your answer.

## The bottom line

You can't inspect your way to a clean model. You can control what it touches. That's what Sovereign AI for NPI means at Fields Intelligence. The app and your tools run on your systems. Inference runs on our infrastructure with no prompt or response logs. And the model only gets the access you give it.
