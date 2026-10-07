import { useEffect, useState } from 'preact/hooks';
import type { UiActions, UiStore } from '../ui-store';
import { FloatingButton } from './FloatingButton';
import { SaveCard } from './SaveCard';
import { Tooltip } from './Tooltip';

export function App({ store, actions }: { store: UiStore; actions: UiActions }) {
  const [state, setState] = useState(store.get());
  useEffect(() => {
    const unsubscribe = store.subscribe(() => setState(store.get()));
    // The effect runs after mount; a store.set() made before it subscribed would be missed.
    setState(store.get());
    return unsubscribe;
  }, [store]);

  switch (state.kind) {
    case 'button':
      return <FloatingButton at={state.at} onClick={() => actions.openCard(state.selection)} />;
    case 'card':
      return <SaveCard at={state.at} selection={state.selection} existing={state.existing} onClose={actions.close} />;
    case 'tooltip':
      return <Tooltip at={state.at} entry={state.entry} />;
    default:
      return null;
  }
}
