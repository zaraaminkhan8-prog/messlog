-- Allow students to delete their own logged meals (for completeness — UI now uses forfeited instead)
CREATE POLICY "Students delete own logged meals"
ON public.meals
FOR DELETE
TO authenticated
USING (auth.uid() = student_id AND status IN ('logged', 'forfeited'));

-- Clean up the stuck breakfast and duplicate refund transactions for the affected user
UPDATE public.meals
SET status = 'forfeited'
WHERE id = '6c5a93c7-f73f-42b6-9fa7-2fd3c1d533c5' AND status = 'logged';

DELETE FROM public.transactions
WHERE id IN (
  'f2caaa6e-2fd0-48dc-aa3c-24944ca16a18',
  '8c682cf0-13a0-4cc7-9ae3-093876835317'
);