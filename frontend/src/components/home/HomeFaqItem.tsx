"use client";

import { useId, useState } from "react";

interface HomeFaqItemProps {
  question: string;
  answer: string;
}

export function HomeFaqItem({ question, answer }: HomeFaqItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const answerId = useId();

  return (
    <article className={`home-faq__item home-reveal${isOpen ? " home-faq__item--open" : ""}`}>
      <button
        type="button"
        className="home-faq__question"
        aria-expanded={isOpen}
        aria-controls={answerId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{question}</span>
        <span className="home-faq__icon" aria-hidden="true" />
      </button>
      <div id={answerId} className="home-faq__answer" aria-hidden={!isOpen}>
        <div>
          <p>{answer}</p>
        </div>
      </div>
    </article>
  );
}
