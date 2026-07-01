import type { FormEvent as ReactFormEvent, ReactNode as ReactReactNode } from 'react';

declare global {
  namespace React {
    type FormEvent<T = Element> = ReactFormEvent<T>;
    type ReactNode = ReactReactNode;
  }
}

export {};
