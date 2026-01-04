## Product requirements
I want to build an app (will start with desktop for Mac and Windows, but could later expand into mobile apps for Android and iOS) to find all similar files on a system and list them for the user in groups to allow the user to decide if they need to delete most of them and keep 1 file.
- "Similar" is defined by the file content without taking its name into consideration.
- We are targeting the entire hard drive, so let's take into consideration requesting all the needed permissions as part of onboarding the user and helping them to the use the app
- Batch Delete: The use can decide "mark for delete" multiple files, then commit once for all marked files to be deleted.
- When a user decides to "delete", the deleted files should go to the System Trash/Recycle Bin, not be permanently deleted
- The app should highlight to the user that they can undo delete by accessing their trash

## Technical requirements
- Let's use the latest versions of all dependencies, given that they have been released over a month ago.
- If there are multiple ways to implement the same feature, let's use the more recent design/architecture/implementation.
- All the data should be saved locally without reaching out to any backend services.
- Assume that anyone running the code won't have the prerequisites and make the needed steps to ease running and building the code on their machine (Mac & Windows).
- Keep track of each step as a separate git commit
	- Let's be as granular as possible so that commits are small: average of 5 files or less per commit