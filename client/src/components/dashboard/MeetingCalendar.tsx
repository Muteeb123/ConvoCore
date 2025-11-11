import React, { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

interface MeetingEvent {
  id: string;
  title: string;
  start: string;
  end: string;
}

const MeetingCalendar: React.FC = () => {
  const [events, setEvents] = useState<MeetingEvent[]>([]);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const title = prompt("Enter meeting title:");
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();

    if (title) {
      const newEvent: MeetingEvent = {
        id: String(Date.now()),
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
      };
      setEvents((prev) => [...prev, newEvent]);
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    if (confirm(`Delete meeting: '${clickInfo.event.title}'?`)) {
      setEvents((prev) => prev.filter((e) => e.id !== clickInfo.event.id));
    }
  };

  return (
    <div className="p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        selectable={true}
        editable={true}
        events={events}
        select={handleDateSelect}
        eventClick={handleEventClick}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
      />
    </div>
  );
};

export default MeetingCalendar;
