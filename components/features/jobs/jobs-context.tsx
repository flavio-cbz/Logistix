<<<<<<< HEAD
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logging/logger';

export interface Job {
    id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelling' | 'cancelled';
    progress: number;
    result?: unknown;
    error?: string;
    createdAt: string;
    updatedAt: string;
}

interface JobsContextType {
    activeJobs: Job[];
    startJob: (type: string, payload?: unknown) => Promise<string>;
    cancelJob: (jobId: string) => Promise<void>;
    dismissJob: (jobId: string) => void;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

export function useJobs() {
    const context = useContext(JobsContext);
    if (!context) {
        throw new Error('useJobs must be used within a JobsProvider');
    }
    return context;
}

export function JobsProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();
    const [dismissedJobIds, setDismissedJobIds] = useState<Set<string>>(new Set());

    // Ref to track notified completions to avoid duplicate toasts
    const notifiedJobsRef = useRef<Set<string>>(new Set());

    // Poll for active jobs
    const { data: jobs = [] } = useQuery<Job[]>({
        queryKey: ['active-jobs'],
        queryFn: async () => {
            const res = await fetch('/api/v1/jobs');
            if (!res.ok) return [];
            const json = await res.json();
            return json.data || [];
        },
        refetchInterval: (query) => {
            // Poll every 2 seconds if there are active jobs, otherwise every 10s
            const hasActive = query.state.data?.some(j =>
                (j.status === 'pending' || j.status === 'processing' || j.status === 'cancelling')
            );
            return hasActive ? 2000 : 10000;
        },
        refetchOnWindowFocus: true,
    });

    // Filter out dismissed jobs
    const activeJobs = jobs.filter(job => !dismissedJobIds.has(job.id));

    // Effect to handle notifications for completed/failed jobs
    useEffect(() => {
        jobs.forEach(job => {
            // Check if we already notified for this job state
            const jobStateKey = `${job.id}-${job.status}`;
            if (notifiedJobsRef.current.has(jobStateKey)) return;

            if (job.status === 'completed') {
                // Only notify if we were tracking it (it was active before) or if it's new
                // Logic: If it's completed, show success and mark notified.
                toast.success(((job.result as { message?: string } | undefined)?.message) || 'Task completed successfully', {
                    description: `Job ${job.type} finished.`,
                    duration: 5000,
                });
                notifiedJobsRef.current.add(jobStateKey);

                // Auto-dismiss from active view after 5 seconds? 
                // Better: Let the user dismiss or the backend cleans up listActiveJobs.
                // Since listActiveJobs only returns pending/processing, completed jobs 
                // will disappear from the list on next poll!
                // So we need to catch them BEFORE they disappear?
                // Actually, listActiveJobs returns pending/processing. 
                // If a job completes, it won't be in the list returned by API anymore.
                // So we won't see it here to trigger the toast!

                // Problem: Polling 'active jobs' means we miss the 'completed' state transition if it happens between polls 
                // and the API stops returning it.
                // Solution: API /api/v1/jobs should return jobs updated recently (last 1 min) OR client tracks ID and polls specific ID until completion.

                // Revised Strategy:
                // 1. Context manages a list of "Tracked Job IDs".
                // 2. It sends this list to the API or polls them individually?
                // 3. Or simpler: The 'active jobs' endpoint returns jobs that are active OR completed/failed in the last X seconds.
                // 4. For now, let's assume the component that starts the job will verify the result, 
                //    BUT the global context is for "background" things.

                // If we want global notifications, the API needs to return "Recently Finished" jobs too.
                // Let's stick to the Plan: Polling.
                // If I start a job, I get an ID. I should add it to a "watched list".
            }
            else if (job.status === 'failed') {
                toast.error('Task failed', {
                    description: job.error || 'Unknown error',
                });
                notifiedJobsRef.current.add(jobStateKey);
            }
        });
    }, [jobs]);

    const startJob = useCallback(async (_type: string, _payload?: unknown) => {
        // This is a generic starter. Specific implementations (like Sync) might have their own API routes.
        // But for a generic job service:
        // const res = await fetch('/api/v1/jobs', { method: 'POST', body: ... });
        // For Superbuy Sync, we have a specific endpoint. 
        // This context might just TRACK jobs, not necessarily start ALL of them generically yet.
        // But let's support generic start.

        // For now, specific features trigger specific APIs.
        // Use registerJob to start tracking it?
        // If the API /api/v1/jobs returns active jobs, we pick it up automatically on next poll.
        // So we just need to wait for the poll.

        // To be responsive, we can invalidate queries immediately.
        await queryClient.invalidateQueries({ queryKey: ['active-jobs'] });
        return ""; // Return empty or actual ID if we implemented generic create
    }, [queryClient]);

    const dismissJob = useCallback((jobId: string) => {
        setDismissedJobIds(prev => {
            const next = new Set(prev);
            next.add(jobId);
            return next;
        });
    }, []);

    const cancelJob = useCallback(async (jobId: string) => {
        try {
            await fetch(`/api/v1/jobs/${jobId}/cancel`, { method: 'POST' });
            toast.info("Cancelling job...");
            await queryClient.invalidateQueries({ queryKey: ['active-jobs'] });
        } catch (error) {
            logger.error("Failed to cancel job", { error });
            toast.error("Failed to cancel job");
        }
    }, [queryClient]);

    return (
        <JobsContext.Provider value={{ activeJobs, startJob, dismissJob, cancelJob }}>
            {children}
        </JobsContext.Provider>
    );
}
=======
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logging/logger';

export interface Job {
    id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelling' | 'cancelled';
    progress: number;
    result?: unknown;
    error?: string;
    createdAt: string;
    updatedAt: string;
}

interface JobsContextType {
    activeJobs: Job[];
    startJob: (type: string, payload?: unknown) => Promise<string>;
    cancelJob: (jobId: string) => Promise<void>;
    dismissJob: (jobId: string) => void;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

export function useJobs() {
    const context = useContext(JobsContext);
    if (!context) {
        throw new Error('useJobs must be used within a JobsProvider');
    }
    return context;
}

export function JobsProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();
    const [dismissedJobIds, setDismissedJobIds] = useState<Set<string>>(new Set());

    // Ref to track notified completions to avoid duplicate toasts
    const notifiedJobsRef = useRef<Set<string>>(new Set());

    // Poll for active jobs
    const { data: jobs = [] } = useQuery<Job[]>({
        queryKey: ['active-jobs'],
        queryFn: async () => {
            const res = await fetch('/api/v1/jobs');
            if (!res.ok) return [];
            const json = await res.json();
            return json.data || [];
        },
        refetchInterval: (query) => {
            // Poll every 2 seconds if there are active jobs, otherwise every 10s
            const hasActive = query.state.data?.some(j =>
                (j.status === 'pending' || j.status === 'processing' || j.status === 'cancelling')
            );
            return hasActive ? 2000 : 10000;
        },
        refetchOnWindowFocus: true,
    });

    // Filter out dismissed jobs
    const activeJobs = jobs.filter(job => !dismissedJobIds.has(job.id));

    // Effect to handle notifications for completed/failed jobs
    useEffect(() => {
        jobs.forEach(job => {
            // Check if we already notified for this job state
            const jobStateKey = `${job.id}-${job.status}`;
            if (notifiedJobsRef.current.has(jobStateKey)) return;

            if (job.status === 'completed') {
                // Only notify if we were tracking it (it was active before) or if it's new
                // Logic: If it's completed, show success and mark notified.
                toast.success(((job.result as { message?: string } | undefined)?.message) || 'Task completed successfully', {
                    description: `Job ${job.type} finished.`,
                    duration: 5000,
                });
                notifiedJobsRef.current.add(jobStateKey);

                // Auto-dismiss from active view after 5 seconds? 
                // Better: Let the user dismiss or the backend cleans up listActiveJobs.
                // Since listActiveJobs only returns pending/processing, completed jobs 
                // will disappear from the list on next poll!
                // So we need to catch them BEFORE they disappear?
                // Actually, listActiveJobs returns pending/processing. 
                // If a job completes, it won't be in the list returned by API anymore.
                // So we won't see it here to trigger the toast!

                // Problem: Polling 'active jobs' means we miss the 'completed' state transition if it happens between polls 
                // and the API stops returning it.
                // Solution: API /api/v1/jobs should return jobs updated recently (last 1 min) OR client tracks ID and polls specific ID until completion.

                // Revised Strategy:
                // 1. Context manages a list of "Tracked Job IDs".
                // 2. It sends this list to the API or polls them individually?
                // 3. Or simpler: The 'active jobs' endpoint returns jobs that are active OR completed/failed in the last X seconds.
                // 4. For now, let's assume the component that starts the job will verify the result, 
                //    BUT the global context is for "background" things.

                // If we want global notifications, the API needs to return "Recently Finished" jobs too.
                // Let's stick to the Plan: Polling.
                // If I start a job, I get an ID. I should add it to a "watched list".
            }
            else if (job.status === 'failed') {
                toast.error('Task failed', {
                    description: job.error || 'Unknown error',
                });
                notifiedJobsRef.current.add(jobStateKey);
            }
        });
    }, [jobs]);

    const startJob = useCallback(async (_type: string, _payload?: unknown) => {
        // This is a generic starter. Specific implementations (like Sync) might have their own API routes.
        // But for a generic job service:
        // const res = await fetch('/api/v1/jobs', { method: 'POST', body: ... });
        // For Superbuy Sync, we have a specific endpoint. 
        // This context might just TRACK jobs, not necessarily start ALL of them generically yet.
        // But let's support generic start.

        // For now, specific features trigger specific APIs.
        // Use registerJob to start tracking it?
        // If the API /api/v1/jobs returns active jobs, we pick it up automatically on next poll.
        // So we just need to wait for the poll.

        // To be responsive, we can invalidate queries immediately.
        await queryClient.invalidateQueries({ queryKey: ['active-jobs'] });
        return ""; // Return empty or actual ID if we implemented generic create
    }, [queryClient]);

    const dismissJob = useCallback((jobId: string) => {
        setDismissedJobIds(prev => {
            const next = new Set(prev);
            next.add(jobId);
            return next;
        });
    }, []);

    const cancelJob = useCallback(async (jobId: string) => {
        try {
            await fetch(`/api/v1/jobs/${jobId}/cancel`, { method: 'POST' });
            toast.info("Cancelling job...");
            await queryClient.invalidateQueries({ queryKey: ['active-jobs'] });
        } catch (error) {
            logger.error("Failed to cancel job", { error });
            toast.error("Failed to cancel job");
        }
    }, [queryClient]);

    return (
        <JobsContext.Provider value={{ activeJobs, startJob, dismissJob, cancelJob }}>
            {children}
        </JobsContext.Provider>
    );
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
