# git-experiment package

```
git clone git@github.com:atom/git-experiment.git
cd git-experiment
apm install
apm link -d
atom .

cd ../some-dir-with-a-git-repo
atom -d
```

It is currently setup to open on start up, no matter what.

### Notes

* `PatchView` renders one file's diff; it's reusable; it's an HTMLElement
* `HistoryView` creates one or more `PatchView` elements
* `nodegit` has the worst incorrect docs ever. Read the [code](https://github.com/nodegit/nodegit/tree/master/lib) and tinker in the console.

### Broken

* Merge commits dont render, dunno why
