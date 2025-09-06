import { getEvents } from '@/app/actions';
import EventManager from './_components/event-manager';

export default async function EventsPage() {
  const events = await getEvents();
  return <EventManager initialEvents={events} />;
}
