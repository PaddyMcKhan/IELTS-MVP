'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Timer from '@/components/Timer';
import EssayBox from '@/components/EssayBox';

export default function Home() {
  const [mode, setMode] = useState<'academic' | 'general'>('academic');
  const [task, setTask] = useState<'task1' | 'task2'>('task2');
  const [duration, setDuration] = useState<number>(60 * 60); // seconds

  return (
    <main className="min-h-dvh bg-white text-slate-900 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">IELTS Writing Practice</h1>
          <Link
            href="https://github.com/"
            target="_blank"
            className="text-sm underline"
          >
            GitHub
          </Link>
        </header>

        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Task</Label>
              <Select value={task} onValueChange={(v) => setTask(v as any)}>
                <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task1">Task 1</SelectItem>
                  <SelectItem value="task2">Task 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={String(duration)}
                onValueChange={(v) => setDuration(Number(v))}
              >
                <SelectTrigger><SelectValue placeholder="Duration" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={(20 * 60).toString()}>20 min</SelectItem>
                  <SelectItem value={(40 * 60).toString()}>40 min</SelectItem>
                  <SelectItem value={(60 * 60).toString()}>60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Timer key={`${mode}-${task}-${duration}`} seconds={duration} />
            <Button variant="default">Submit (UI only)</Button>
          </div>
        </Card>

        <Card className="p-4">
          <EssayBox />
        </Card>
      </div>
    </main>
  );
}
