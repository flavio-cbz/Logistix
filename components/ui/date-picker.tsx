<<<<<<< HEAD
"use client"

import * as React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/shared/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import "react-day-picker/dist/style.css"

interface DatePickerProps {
    value?: Date
    onChange?: (date: Date | undefined) => void
    placeholder?: string
    disabled?: boolean
    className?: string
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Sélectionner une date",
    disabled = false,
    className,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false)

    const handleSelect = (selectedDate: Date | undefined) => {
        if (onChange) {
            onChange(selectedDate)
        }
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value ? format(value, "PPP", { locale: fr }) : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <DayPicker
                    mode="single"
                    selected={value}
                    onSelect={handleSelect}
                    locale={fr}
                    footer={
                        value ? (
                            <div className="p-3 border-t text-center text-sm">
                                Sélection: {format(value, "PP", { locale: fr })}
                            </div>
                        ) : undefined
                    }
                    modifiersClassNames={{
                        selected: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md",
                        today: "bg-accent text-accent-foreground font-bold rounded-md"
                    }}
                    styles={{
                        head_cell: { width: "100%" },
                        table: { maxWidth: "none" },
                        day: { margin: "0.1em" }
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}
=======
"use client"

import * as React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/shared/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import "react-day-picker/dist/style.css"

interface DatePickerProps {
    value?: Date
    onChange?: (date: Date | undefined) => void
    placeholder?: string
    disabled?: boolean
    className?: string
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Sélectionner une date",
    disabled = false,
    className,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false)

    const handleSelect = (selectedDate: Date | undefined) => {
        if (onChange) {
            onChange(selectedDate)
        }
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value ? format(value, "PPP", { locale: fr }) : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <DayPicker
                    mode="single"
                    selected={value}
                    onSelect={handleSelect}
                    locale={fr}
                    footer={
                        value ? (
                            <div className="p-3 border-t text-center text-sm">
                                Sélection: {format(value, "PP", { locale: fr })}
                            </div>
                        ) : undefined
                    }
                    modifiersClassNames={{
                        selected: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md",
                        today: "bg-accent text-accent-foreground font-bold rounded-md"
                    }}
                    styles={{
                        head_cell: { width: "100%" },
                        table: { maxWidth: "none" },
                        day: { margin: "0.1em" }
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
