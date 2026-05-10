
DROP POLICY "tasks family access" ON public.tasks;
CREATE POLICY "tasks family access" ON public.tasks FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "shopping family access" ON public.shopping_items;
CREATE POLICY "shopping family access" ON public.shopping_items FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "calendar family access" ON public.calendar_events;
CREATE POLICY "calendar family access" ON public.calendar_events FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "notes family access" ON public.notes;
CREATE POLICY "notes family access" ON public.notes FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
