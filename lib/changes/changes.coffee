# This is the view-model for the root view of the "view and commit changes" tab
# It seems as good a place as any to describe the approximate architecture of this
# element and how the component parts work together.
#
# There is one data model, `GitChanges` that can be considered the foundational
# object. It performs all git commands and tracks the on-disk state of the index, and
# provides an `onDidUpdateRepository(callback)` function to register to be notified
# of repo state changes. One instance of this model is shared among all view-models
# and serves as a message bus for everything that needs to response to changes
# in the git index.
#
# This class and its accompanying view are one step above, and the base of the
# view hierarchy. A reference to ChangesView is passed down the tree to each child
# view, and if there are events that need to be emitted that are purely the concern
# of the UI (that is to say not bubbled up from an attribute changing on a view-model),
# we can dispatch events on the ChangesView element. (I'm not sure if this is the
# right way to do things, but some of the prototype followed this pattern - i suspect
# every view change should be driven by an observed model attribute changing)
#
# Each view is a custom HTML element and should follow the naming pattern
# {name-of-view-model}Element. The view-model can listen to events on GitChanges
# and update its attributes appropriately. The custom element itself should only
# have code concerned with displaying data from the view-model and responding to
# events from the DOM and handing off the real work to the view-model. Rather
# than templates & data binding, these views use Object.observe (exposed through
# a simple `observe` helper module).
#
# A view will typically have an update function that updates some `textContent`
# and some `classList` attributes when model attributes change. For simple views
# (most views) this will probably mean just one update function total, but it's
# possible in complex cases to have separate update functions for different sets
# of keys to prevent overdoing DOM updates. using observe in this way looks like:
#
# ```
# observe @model, ['dog', 'cat', 'horse'], @update.bind(@)
# ```
#
# `update()` will then just take a look at the model and update the elements in
# the view appropriately when attributes have changed. (If you find
# yourself needing a bunch of separate update() methods perhaps you could split
# up your view into more than one view).
#
# This separation will let us test the models directly in terms of how they
# respond to different kinds of on-disk state, and let us test the views directy
# in terms of display and correctness, without having to rely entirely on
# integration tests or elaborate mocking.

GitChanges = require './git-changes'

module.exports = class Changes
  # The view-model for the root ChangesView
  constructor: ->
    @git = new GitChanges
