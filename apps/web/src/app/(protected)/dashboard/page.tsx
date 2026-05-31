"use client";

import { PageHeader } from "@/components/ui";
import DashboardContent from "@/components/dashboard/DashboardContent";

export default function DashboardPage() {
  // Lógica de seleção de data desativada
  // const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // const handleDateChange = (selectedDates: Date[]) => {
  //   if (selectedDates.length > 0) {
  //     setSelectedDate(selectedDates[0]);
  //   }
  // };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        // DatePicker desativado
        // actions={
        //   <DatePicker
        //     id="dashboard-date-picker"
        //     mode="single"
        //     defaultDate={selectedDate}
        //     onChange={handleDateChange}
        //     placeholder="Selecionar data"
        //   />
        // }
      />
      <div className="mt-4">
        <DashboardContent />
      </div>
    </div>
  );
}
