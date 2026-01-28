<<<<<<< HEAD

"use client";

import React from 'react';

import { useJobs } from './jobs-context';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

export function NotificationCenter() {
    const { activeJobs, cancelJob } = useJobs();
    const toastMap = useRef<Map<string, string | number>>(new Map());

    // Effect to sync active jobs with toasts
    useEffect(() => {
        activeJobs.forEach(job => {
            // Generate a stable ID for the toast
            const toastId = `job-${job.id}`;

            // If pending/processing, show or update loading toast
            if (job.status === 'processing' || job.status === 'pending' || job.status === 'cancelling') {
                const message = ((job.result as { message?: string } | undefined)?.message) || (job.status === 'pending' ? 'Pending...' : (job.status === 'cancelling' ? 'Cancelling...' : 'Processing...'));
                const progress = job.progress || 0;
                const isCancelling = job.status === 'cancelling';

                // Create or update toast
                toast.message(
                    <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Loader2 className={`h-4 w-4 text-primary ${isCancelling ? '' : 'animate-spin'}`} />
                                <span className="font-medium">{job.type === 'superbuy_sync' ? 'Superbuy Sync' : 'Background Task'}</span>
                            </div>
                            {!isCancelling && (
                                <button
                                    onClick={() => cancelJob(job.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10"
                                    title="Cancel"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate" title={message}>{message}</div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ease-out ${isCancelling ? 'bg-destructive/50' : 'bg-primary'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                    , {
                        id: toastId,
                        duration: Infinity, // Don't auto-dismiss while running
                    });

                toastMap.current.set(job.id, toastId);
            }
        });

        // Cleanup toasts for jobs that are no longer active
        toastMap.current.forEach((toastId, jobId) => {
            const stillActive = activeJobs.find(j => j.id === jobId);
            if (!stillActive) {
                // Job is gone from active list (completed or failed or dismissed)
                toast.dismiss(toastId);
                toastMap.current.delete(jobId);
            }
        });

    }, [activeJobs, cancelJob]);

    return null;
}

=======

"use client";

import React from 'react';

import { useJobs } from './jobs-context';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

export function NotificationCenter() {
    const { activeJobs, cancelJob } = useJobs();
    const toastMap = useRef<Map<string, string | number>>(new Map());

    // Effect to sync active jobs with toasts
    useEffect(() => {
        activeJobs.forEach(job => {
            // Generate a stable ID for the toast
            const toastId = `job-${job.id}`;

            // If pending/processing, show or update loading toast
            if (job.status === 'processing' || job.status === 'pending' || job.status === 'cancelling') {
                const message = ((job.result as { message?: string } | undefined)?.message) || (job.status === 'pending' ? 'Pending...' : (job.status === 'cancelling' ? 'Cancelling...' : 'Processing...'));
                const progress = job.progress || 0;
                const isCancelling = job.status === 'cancelling';

                // Create or update toast
                toast.message(
                    <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Loader2 className={`h-4 w-4 text-primary ${isCancelling ? '' : 'animate-spin'}`} />
                                <span className="font-medium">{job.type === 'superbuy_sync' ? 'Superbuy Sync' : 'Background Task'}</span>
                            </div>
                            {!isCancelling && (
                                <button
                                    onClick={() => cancelJob(job.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10"
                                    title="Cancel"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate" title={message}>{message}</div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ease-out ${isCancelling ? 'bg-destructive/50' : 'bg-primary'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                    , {
                        id: toastId,
                        duration: Infinity, // Don't auto-dismiss while running
                    });

                toastMap.current.set(job.id, toastId);
            }
        });

        // Cleanup toasts for jobs that are no longer active
        toastMap.current.forEach((toastId, jobId) => {
            const stillActive = activeJobs.find(j => j.id === jobId);
            if (!stillActive) {
                // Job is gone from active list (completed or failed or dismissed)
                toast.dismiss(toastId);
                toastMap.current.delete(jobId);
            }
        });

    }, [activeJobs, cancelJob]);

    return null;
}

>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
