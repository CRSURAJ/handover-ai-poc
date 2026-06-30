"use client";

import { useEffect, useState } from "react";

const JOKES: Array<{ setup: string; punchline: string }> = [
  { setup: "Why don't scientists trust atoms?", punchline: "Because they make up everything!" },
  { setup: "I'm reading a book about anti-gravity.", punchline: "It's impossible to put down." },
  { setup: "Why did the scarecrow win an award?", punchline: "Because he was outstanding in his field." },
  { setup: "I used to hate facial hair…", punchline: "But then it grew on me." },
  { setup: "What do you call a fake noodle?", punchline: "An impasta." },
  { setup: "Why did the bicycle fall over?", punchline: "Because it was two-tired." },
  { setup: "What do you call cheese that isn't yours?", punchline: "Nacho cheese." },
  { setup: "Why don't eggs tell jokes?", punchline: "They'd crack each other up." },
  { setup: "What do you call a sleeping dinosaur?", punchline: "A dino-snore." },
  { setup: "What's the best thing about Switzerland?", punchline: "I don't know, but the flag is a big plus." },
  { setup: "I used to be a banker…", punchline: "But I lost interest." },
  { setup: "What did the ocean say to the beach?", punchline: "Nothing, it just waved." },
  { setup: "Why did the cookie go to the doctor?", punchline: "Because it was feeling crumby." },
  { setup: "I only know 25 letters of the alphabet.", punchline: "I don't know y." },
  { setup: "Why did the golfer bring an extra pair of pants?", punchline: "In case he got a hole in one." },
  { setup: "How do you organise a space party?", punchline: "You planet." },
  { setup: "Why did the stadium get hot after the game?", punchline: "All the fans left." },
  { setup: "What do you call a factory that makes okay products?", punchline: "A satisfactory." },
  { setup: "Why did the math book look so sad?", punchline: "Because it had too many problems." },
  { setup: "What do you call a bear with no teeth?", punchline: "A gummy bear." },
  { setup: "I'm afraid for the calendar.", punchline: "Its days are numbered." },
  { setup: "Why do cows wear bells?", punchline: "Because their horns don't work." },
  { setup: "What do you call a can opener that doesn't work?", punchline: "A can't opener." },
  { setup: "I told a joke about a roof once.", punchline: "It went over everyone's head." },
  { setup: "What do you call a sleeping bull?", punchline: "A bulldozer." },
  { setup: "Why can't a nose be 12 inches long?", punchline: "Because then it would be a foot." },
  { setup: "Did you hear about the guy who invented Lifesavers?", punchline: "He made a mint." },
  { setup: "I would tell you a construction joke…", punchline: "But I'm still working on it." },
  { setup: "What do you call a pile of cats?", punchline: "A meow-ntain." },
  { setup: "Why did the invisible man turn down the job offer?", punchline: "He couldn't see himself doing it." },
  { setup: "What do you call a man with a rubber toe?", punchline: "Roberto." },
  { setup: "Why did the tomato turn red?", punchline: "Because it saw the salad dressing." },
  { setup: "I asked my dog what two minus two is.", punchline: "He said nothing." },
  { setup: "What do you call a dinosaur that crashes their car?", punchline: "Tyrannosaurus wrecks." },
  { setup: "I'm on a seafood diet.", punchline: "I see food and I eat it." },
];

const PUNCHLINE_DELAY = 3000;  // 3 s before revealing the punchline
const CYCLE_DURATION  = 8000;  // 8 s total per joke before moving to the next

function pickNext(current: number): number {
  if (JOKES.length <= 1) return 0;
  let next: number;
  do { next = Math.floor(Math.random() * JOKES.length); } while (next === current);
  return next;
}

export function LoadingOverlay({ visible, onCancel }: { visible: boolean; onCancel?: () => void }) {
  const [jokeIdx, setJokeIdx] = useState(0);
  const [showPunchline, setShowPunchline] = useState(false);

  // When the overlay becomes visible, pick a fresh joke and start timing.
  useEffect(() => {
    if (!visible) return;
    setJokeIdx(pickNext(-1));
    setShowPunchline(false);
  }, [visible]);

  // Each time the joke index changes, schedule the punchline reveal.
  useEffect(() => {
    if (!visible) return;
    setShowPunchline(false);
    const t = setTimeout(() => setShowPunchline(true), PUNCHLINE_DELAY);
    return () => clearTimeout(t);
  }, [visible, jokeIdx]);

  // Cycle to a new joke every CYCLE_DURATION while the overlay is visible.
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => {
      setJokeIdx((prev) => pickNext(prev));
    }, CYCLE_DURATION);
    return () => clearInterval(t);
  }, [visible]);

  if (!visible) return null;

  const joke = JOKES[jokeIdx];

  return (
    <div className="loadingOverlay">
      <div className="loadingCard">
        {onCancel && (
          <button className="loadingCancelBtn" onClick={onCancel} aria-label="Cancel">
            ✕
          </button>
        )}
        <div className="loadingSpinnerRing" />
        <p className="loadingLabel">Generating your documents…</p>
        <div className="jokeBox" key={jokeIdx}>
          <p className="jokeSetup">{joke.setup}</p>
          <p className={`jokePunchline ${showPunchline ? "jokePunchline--visible" : ""}`}>
            {showPunchline ? joke.punchline : "…"}
          </p>
        </div>
      </div>
    </div>
  );
}
