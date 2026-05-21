# gtfs-mini fixture

A minimal valid GTFS feed used by the loader and build-script tests. Five
southbound stops on the NYC Subway 1 line (Times Sq → Franklin St) with two
weekday morning trips. Coordinates and `stop_id`s match the real MTA feed so
downstream code is exercised against realistic values.

The `.txt` files are the source of truth. The companion `gtfs-mini.zip` (one
directory up, at `tests/fixtures/gtfs-mini.zip`) is the artifact consumed by
`minotor`'s `GtfsParser`, which only reads from a zip path.

## Rebuilding the zip

After editing any `.txt` file, regenerate the zip:

```sh
npm run fixtures:rebuild
```

The script zips the contents of this directory (no parent path entries) into
`tests/fixtures/gtfs-mini.zip`.

## Active date

`calendar.txt` covers `20200101`–`20991231` on weekdays. Tests must call
`parseTimetable` with a weekday inside that range. The loader tests pin a fixed
weekday so they remain deterministic.
