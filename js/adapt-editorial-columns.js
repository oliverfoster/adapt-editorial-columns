define([
		'require',
		'extensions/adapt-editorial/js/hbs',
		'extensions/adapt-editorial/js/adapt-editorial'
	],function(require, hbs) {

	var Adapt = require("coreJS/adapt");
	var Block = Adapt.editorial.blockStore.block;

	var cache = {};

	var Columns = Block.extend({
		className: function() {
			var classes = Block.prototype.className.call(this);
			classes += " jqeditorial clearfix ";
			return classes.trim();
		},
		initialize: function() {
			throttle.extend(this);
			Block.prototype.initialize.apply(this, arguments);
		},
		setupEventListeners: function() {
			Block.prototype.setupEventListeners.apply(this, arguments);
			this.listenTo(Adapt, "device:resize", this.onResize, this);
		},
		render: function() {
			var template = Handlebars.templates[this.template];
			var rendered = template(this.model);

			if (!this.root) return;

			this.$el.html(rendered);
			
			var config = this.root.model.get("_editorial");
			var data = _.extend({}, this.model, config );
			data.breakRegEx = /((\{\{\{){1}[^(\{\{\{)]*(\}\}\}){1})|((\{\{){1}[^(\{\{)]*(\}\}){1})|([^\ ]*[\ ]{1})|([^\ ]+$)/g;
			data.preRender = _.bind(this.preRender, this);
			data.postRender = _.bind(this.postRender, this);
			this.$el.editorial(data);

		},
		preRender: function() {
			if (!cache[this.model._id]) {
				var template = this.$el.find(".jqeditorial-renderer").html();
				cache[this.model._id] = hbs.compile(template);
			}

			var data = {
				_editorial: this.root.model.get("_editorial"),
				_parent: this
			};
			var rendered = cache[this.model._id](data);
			this.$el.find(".jqeditorial-renderer").html(rendered)

			this.addChildren();
			
		},
		renderChild: function($container, block) {
			var childView = Adapt.editorial.blockStore[block._type]
			var childConfig = Adapt.editorial.blockConfig[block._type]
			var into = this.$el.find("#"+block._id);
			var child = new childView({
				model:block, 
				root: this.root,
				parent: this,
				$el: into
			});
			this.listenToOnce(child, "ready", function() {
				if (this.checkReady()) {
					this.$el.velocity({opacity:1}, {duration: 500, complete:_.bind(function(){
						this.done('render');
					},this)});
				}
			});
		},
		postRender: function() {
			var $renderer = this.$el.find(".jqeditorial-renderer");
			$renderer.a11y_on(false);

			var $rendered = this.$el.find(".jqeditorial-rendered");
			$rendered.find(".textfill").removeClass("textfill").addClass('nowrap');
			$rendered.a11y_text();

			if (!this.root) return;
			this.$el.css("height", "");

			this.width = $rendered.width();

		},

		onResize: function() {
			var $rendered = this.$el.find(".jqeditorial-rendered");
			if (!this.model) return;
			
			if ($rendered.width() == this.width ) return;

			this.throttle('render', function() {
				this.trigger("remove");
				this.$el.css("height", this.$el.height()+"px");
				this.$el.velocity({opacity:0}, {duration: 50, complete:_.bind(function(){
					this.render();
				},this)});
			}, 1000);
		},

		template: "editorial-columns"
	});

	Adapt.editorial.register("columns", Columns, {
		accessible: false
	});

	return Columns;

});