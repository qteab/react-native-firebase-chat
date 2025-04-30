### Message caching in CuteChat

The subscriptions toward messages are setup the following way:

- 1️⃣ One that fetches and subscribes to the latest 20 messages upon initialization, ignoring incoming messages, therefore staying static and only affected by deletion or modification of specified messages
- 2️⃣ One that fetches and subscribes to messages after a specified `messageDoc` (previous messages)
- 3️⃣ One that fetches and subscribes to messages that were created after the timestamp of the `CuteChat` intialization (only new messages)

No caching is ever emptied, but only accordingly updated based on the snapshot event changes, meaning the list will persist, and minimize the disruption for the user.
