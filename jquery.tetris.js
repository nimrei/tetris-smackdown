if ( typeof Object.create !== 'function' ) {
	Object.create = function( obj ) {
		function F() {};
		F.prototype = obj;
		return new F();
	};
}

(function($, window, document, undefined) {

	jQuery.fn.exists = function(){return this.length>0;}
	Array.prototype.unique = function() {
	    var derivedArray = [];
	    for (var i = 0; i < this.length; i += 1) {
	        if (derivedArray.indexOf(this[i]) == -1) {
	            derivedArray.push(this[i])
	        }
	    }
	    return derivedArray;
	};

	var keys =  {
            UP: 38,
            DOWN: 40,
			LEFT: 37,
            RIGHT: 39,
            SPACEBAR: 32,
            R: 82
        };

    var gameState = {
    		PAUSED: 0,
    		RUNNING: 1,
    		GAMEOVER: 2
    };

    var blockType = ['O','T','L','J','I','S','Z'];
    

	var Tetris = {

		init: function( elem, options ) {
			
			var self = this;

			self.elem = elem;
			self.$elem = $(elem);

			self.options = $.extend( {}, $.fn.tetris.options, options);

			//pause game until we're given the okay to start from the user
			self.gameState = gameState.PAUSED;

			//setup our gameboard's dimensions
			self.$elem.css({
                width: self.options.columns * self.options.tileSize,
                height: self.options.rows * self.options.tileSize
            });

			//setup gameover screen
			for(var i=0; i<self.options.rows;i++){
				for(var j=0; j<self.options.columns;j++){
					self.$elem.find('.gameover').append(
						$('<div>', {
								class: 'gameover-tile type-' + blockType[Math.floor(Math.random()*7)],//self.randomTile()],
							}).css({top: i*self.options.tileSize, left: j*self.options.tileSize})
						);
				}
			}	

			//bind our keypress methods - should only do this once
			$(document).bind('keydown',  $.proxy(self.keyDown, self));
		},

		//captures a key event and redirects to appropriate event
		keyDown: function (e) {
            var code = e.charCode || e.keyCode,
                self = this;

            switch(code)
            {
            	case keys.LEFT:
	            	if(self.gameState == gameState.RUNNING){
	            		self.move(-1);
	            	}
            	break;

            	case keys.RIGHT:
            		if(self.gameState == gameState.RUNNING){
	            		self.move(1);
	            	}
            	break;

            	case keys.UP:
            		if(self.gameState == gameState.RUNNING){
	            		self.rotate();
	            	}
            	break;

            	case keys.DOWN:
            		if(self.gameState == gameState.RUNNING){
	            		self.down();
	            	}
            	break;

            	case keys.SPACEBAR: //toggle pause/running
					if(self.gameState == gameState.RUNNING || self.gameState == gameState.PAUSED){
            			self.togglePause();
            		}
            	break;

            	case keys.R: //restart game in case of game over
            		if(self.gameState == gameState.GAMEOVER){
            			self.start();
            		}
            	break;

				case 85:
            		if(self.gameState == gameState.RUNNING){
	            		self.addLines(1);
	            	}
				break;
            }

		},

		//cycles through 1 game tick
		cycle: function ( length ) {
			var self = this;
			
			self.down();
		},

		//integrates current tile into the set pieces on the board
		freeze: function() {
			var self = this;

			var currentTile = self.currentTile;
			var tilePositions = self.getTilePositions(currentTile); 

			//rows that the pieces of the block are in 
			//(we'll need to check once added to frozen if we have any complete rows)
			var checkRows = $.map(tilePositions, function(val, i) { return val.y }).unique().sort();

			//add our positions to the frozen elements array
			$.each(tilePositions, function(i, val){
				var frozenIndex = (val.y * self.options.columns) + val.x;
				self.frozen[frozenIndex] = true;
			});

			//set the html to our frozen class
			var currentTileElem = self.$elem.find('.current').addClass('frozen').removeClass('current');


			//TODO: place this in separate function
			var completedRows = [];
			//check if we've got any completed rows
			$.each(checkRows, function(i, val){
				if(self.isRowComplete(val)){
					
					completedRows.push(val);
				}
			});

			//remove and completed lines
			if(completedRows.length > 0){
				self.removeLines(completedRows);

				//change the level if we need to
				if(Math.floor(self.lines/10) % 10 != Math.floor((self.lines+completedRows.length)/10) % 10 ){
					self.changeLevel(Math.floor((self.lines+completedRows.length)/10));
				}

				self.lines += completedRows.length;

				self.$elem.find('.details .lines').text(self.lines);

				self.$elem.find('.details .level').text(Math.floor(self.lines/10));
			}

		},


		isRowComplete: function(rowNum){
			var self = this;

			for(var i = rowNum*self.options.columns; i<((rowNum+1)*self.options.columns); i++){
				if(!self.frozen[i]){
					return false;
				}
			}
			return true;
		},

		//TODO: split our the 3 phases of this function into separate ones
		//remove lines -> update frozen, add lines to score, update level, cool animations?
		removeLines: function(linesToRemove){
			var self = this;

			//for the line we're removing
			for(var i=0;i<linesToRemove.length;i++){

				//delete their 'frozen entries'
				for(var j=0;j<self.options.columns;j++){
					if(self.frozen[(linesToRemove[i]*self.options.columns)+j]){
						delete self.frozen[(linesToRemove[i]*self.options.columns)+j];
					}
				}

				//mark their pieces as 'toRemove'
				var currentLineTopPosition = Math.floor((linesToRemove[i])%self.options.rows)*self.options.tileSize;
				self.$elem
					.find('.frozen')
					.filter(function() {return $(this).css('top') == currentLineTopPosition+'px';})
					.addClass('to-remove');
				
			}

			//from every line above the first line that we're removing...
			for(var i=linesToRemove[linesToRemove.length-1]-1;i>0;i--){

				//this value should always be in the range [1,4]
				var rowsToMoveDown = $.grep(linesToRemove, function(val, index){return (val > i)}).length;

				//update their 'frozen entries'
				for(var j=0;j<self.options.columns;j++){
					var oldIndex = (i*self.options.columns)+j;
					var newIndex = ((i+rowsToMoveDown)*self.options.columns)+j;

					if(self.frozen[oldIndex]){
						delete self.frozen[oldIndex];
						self.frozen[newIndex] = true;
					}
				}

				//mark their relevant pieces as 'down-{rowsToMoveDown}'
				var currentLineTopPosition = Math.floor(i%self.options.rows)*self.options.tileSize;
				self.$elem
					.find(".frozen")
					.filter(function() {return $(this).css('top') == currentLineTopPosition+'px';})
					.addClass('down-'+rowsToMoveDown);
			}


			self.pause();

			//update elements -> flash a couple of times before removing
			$.when(self.$elem.find('.to-remove')
				.fadeOut(100)
				.fadeIn(100)
				.fadeIn(100)
				.fadeOut(100)
				)
			.done(function(){
				
				self.$elem
					.find('.to-remove')
					.remove();

				for(var i=1;i<=linesToRemove.length;i++){
				
					var rowPixelModifier = i*self.options.tileSize;
					self.$elem
						.find('.down-'+i)
						.css('top','+='+rowPixelModifier)
						.removeClass('down-'+i);
				}

				self.resume();
			});

		},


		//TODO: make sure lineAdd does an appropriate check for gameover once the lines are added in 
		//		i.e. does the new frozen board overlap the current tile?

		// adds lines to the bottom of the current player's board
		// this function will be triggered when an opponent scores > 2 lines
		addLines: function(linesToAdd){
			var self = this;


			//move every line up num_lines on the frozen board
		
			//for the line we're adding
			for(var i=0;i<self.options.rows;i++){

				//move their 'frozen entries'
				for(var j=0;j<self.options.columns;j++){		

					//if its a frozen block	
					if(self.frozen[(i*self.options.columns)+j]){

						var oldIndex = (i*self.options.columns)+j;
						var newIndex = ((i-linesToAdd)*self.options.columns)+j
						
						//delete its old frozen entry
						delete self.frozen[(i*self.options.columns)+j];

						//add new entry in new frozen index
						self.frozen[newIndex] = true;
					

						//mark their relevant pieces as 'up-{linesToAdd}'
						var currentLineTopPosition = Math.floor(i%self.options.rows)*self.options.tileSize;
				
						self.$elem
						.find(".frozen")
						.filter(function() {return $(this).css('top') == currentLineTopPosition+'px';})
						.addClass('up-'+linesToAdd);
					}
				}
			}



			var randomColumn = Math.floor(Math.random() * self.options.columns);

			//now lets add in our new rows

			//PRE: at this stage the frozen board should be empty for items in the last 'linesToAdd' rows
			for(var i=self.options.rows-linesToAdd;i<self.options.rows;i++){

				for(var j=0;j<self.options.columns;j++){
				
					if(j != randomColumn){
						
						//set our frozen index
						var index = (i*self.options.columns)+j;
						self.frozen[index] = true;

						//add new element at relevant spot
						var currentTopPosition = Math.floor(i%self.options.rows)*self.options.tileSize;
						var currentLeftPosition = Math.floor(j%self.options.columns)*self.options.tileSize;								
						self.$elem.append(
							$('<div>')
								.addClass('tile frozen type-Opponent')
								.css({
										left: currentLeftPosition,
										top: currentTopPosition
									})
							);
					}

				}

			}

			//finally, lets move all our existing rows up by the relevant amount			
			var rowPixelModifier = linesToAdd*self.options.tileSize;
			self.$elem
				.find('.up-'+linesToAdd)
				.css('top','-='+rowPixelModifier)
				.removeClass('.up-'+linesToAdd);

		},


		//renders the currentTile on our container element
		render: function() {
			var self = this;

			var currentTile = self.currentTile;
			var tilePositions = self.getTilePositions(currentTile);
			
			var currentTileElem = self.$elem.find('.current');

			if(!currentTileElem.exists()){

				//create html for each point for the current tile & add it to the self.$elem
				$.each(tilePositions, function(){
					self.$elem.append($('<div>', {class: 'tile current type-' + blockType[currentTile.type] }));
				});

				currentTileElem = self.$elem.find('.current');
			}

			//position it correctly on the board
			$.each(currentTileElem, function(i, tilePieceElem){
				$(tilePieceElem).css({
					left: (tilePositions[i].x % self.options.columns) * self.options.tileSize,
					top: Math.floor((tilePositions[i].y)%self.options.rows)*self.options.tileSize
				});
			});
		},

		makeTile: function(type) {
            var self = this;

			if (!self.tileCache) {
            	self.tileCache = [
            		{
            			type: 'O',
            			states: [[	0,0,0,0,
            						0,1,1,0,
            						0,1,1,0,
            						0,0,0,0]] 
            		},
            		{
            			type: 'T',
            			states: [  [0,0,0,0,
            						1,1,1,0,
            						0,1,0,0,
            						0,0,0,0],

            					   [0,1,0,0,
            						1,1,0,0,
            						0,1,0,0,
            						0,0,0,0],

            					   [0,1,0,0,
            						1,1,1,0,
            						0,0,0,0,
            						0,0,0,0],

            					   [0,1,0,0,
            						0,1,1,0,
            						0,1,0,0,
            						0,0,0,0]]
            		},
            		{
            			type: 'L',
            			states: [[	0,0,0,0,
            						1,1,1,0,
            						1,0,0,0,
            						0,0,0,0],

            					   [0,1,0,0,
            						0,1,0,0,
            						0,1,1,0,
            						0,0,0,0],

            					   [0,0,1,0,
            						1,1,1,0,
            						0,0,0,0,
            						0,0,0,0],

            					   [1,1,0,0,
            						0,1,0,0,
            						0,1,0,0,
            						0,0,0,0]]
            		},
					{
            			type: 'J',
            			states:  [[	0,0,0,0,
            						1,1,1,0,
            						0,0,1,0,
            						0,0,0,0],

            					   [0,1,0,0,
            						0,1,0,0,
            						1,1,0,0,
            						0,0,0,0],

            					   [1,0,0,0,
            						1,1,1,0,
            						0,0,0,0,
            						0,0,0,0],

            					   [0,1,1,0,
            						0,1,0,0,
            						0,1,0,0,
            						0,0,0,0]]
            		},
            		{
            			type: 'I',
            			states: [[	0,0,0,0,
            						1,1,1,1,
            						0,0,0,0,
            						0,0,0,0],

            					   [0,1,0,0,
            						0,1,0,0,
            						0,1,0,0,
            						0,1,0,0]]
            		},
            		{
            			type: 'S',
            			states: [[	0,0,0,0,
            						1,1,0,0,
            						0,1,1,0,
            						0,0,0,0],

            					   [0,0,1,0,
            						0,1,1,0,
            						0,1,0,0,
            						0,0,0,0]]
            		},
            		{
            			type: 'Z',
            			states: [[	0,0,0,0,
            						0,0,1,1,
            						0,1,1,0,
            						0,0,0,0],

            					   [0,1,0,0,
            						0,1,1,0,
            						0,0,1,0,
            						0,0,0,0]]
            		}
                ];
            }

            return {
            			x: Math.floor(self.options.columns/2) - 2,
            			y: 0, 
            			type: self.randomTile(),
            			rotation: 0
					};
		},

			//TODO: add tracking for 'next tile'
		randomTile: function(){
	        var self = this;

	        // Random Generator using Knuth shuffle (http://tetris.wikia.com/wiki/Random_Generator)
	        if (!self.randomBag || self.randomBag.length == 0) {
	            var tilesCount = self.tileCache.length;
	            self.randomBag = [];

	            for (var i = 0; i < tilesCount; i++) {
	                self.randomBag[i] = i;
	            }

	            for (var i = tilesCount - 1; i > 0; i--) {
	                var rand = Math.floor(Math.random() * i),
	                    tmp = self.randomBag[rand];
	                self.randomBag[rand] = self.randomBag[i];
	                self.randomBag[i] = tmp;
	            }
	        }
	        return self.randomBag.shift();
		},

		getTilePositions: function(tile){
			var self = this;

			//get 4 position markers for our tile
			return $.map(self.tileCache[tile.type].states[tile.rotation], function(val, i){
				if(val == 1){

					//calculate its x,y position on the board [row,col]
					var pieceRow = Math.floor(i/4);
					var pieceCol = i % 4;

					return {x: tile.x+pieceCol, y: tile.y+pieceRow};
				}
			});
		},

		canMoveHere: function(tile){
			var self = this;

			var tilePositions = self.getTilePositions(tile);

			for(var i=0;i<tilePositions.length;i++){

				//is its x value not in the range [0,cols-1] ?
				if(tilePositions[i].x < 0 || tilePositions[i].x >= self.options.columns){
					return false;
				}

				//is its y value < 0 ?
				if(tilePositions[i].y > (self.options.rows-1)){
					return false;
				}

				//is that spot already taken by a frozen piece ?
				var frozenIndex = (tilePositions[i].y * self.options.columns) + tilePositions[i].x;
				if(self.frozen[frozenIndex]){
					return false;
				}
			}
			return true;
		},

			//rotates the tile 90 degrees
		rotate: function(){
			var self = this;

			var newRotationValue = (self.currentTile.rotation + 1) % self.tileCache[self.currentTile.type].states.length;
			var potentialTile = $.extend({}, self.currentTile, { rotation: newRotationValue});

			if(self.canMoveHere(potentialTile)){
				self.currentTile.rotation = newRotationValue;
			}

			self.render();
		},

			//moves the current block left or right
		move: function(directionModifier){
			var self = this;

			var newColumnPosition = self.currentTile.x + directionModifier;
			var potentialTile = $.extend({}, self.currentTile, { x: newColumnPosition});

			if(self.canMoveHere(potentialTile)){
				self.currentTile.x += directionModifier;
			}

			self.render();
		},


			//moves the current block down one square (if it can)
		down: function(){
			var self = this;

			var newRowPosition = self.currentTile.y + 1;
			var potentialTile = $.extend({}, self.currentTile, { y: newRowPosition});

			if(self.canMoveHere(potentialTile)){
				self.currentTile.y++;
			}
			else {
				self.freeze();

				self.currentTile = self.makeTile();

				//check here for gameover state - i.e. can a new tile fit where its first placed?
				if(!self.canMoveHere(self.currentTile)){
					self.gameover();
				}

			}

			self.render();
		},

		//TODO: refactor how this fits in with the start/pause/resume cycle 
		//changes level and the game cycling rate
		changeLevel: function(newLevel) {
			var self = this;

			window.clearInterval(self.timer);
			self.level = newLevel;
			self.options.refresh = (1500-(self.level*75)) < 0 ? 0 : (1500-(self.level*75));

			self.resume();
		},

		start: function () {
			var self = this;

			//hide the gameover screen
			self.$elem.find('.gameover').hide();

			//get rid of any existing tile elements
			self.$elem.find('.frozen, .current').remove();


			//set our scrolling rate
			self.options.refresh = 1500;

			//set the game to a running state
			self.resume();

			//reset #lines cleared
			self.lines = 0;

			//reset frozen board
			self.frozen = {};		

			//TODO: this is just to test the tile cache
			self.currentTile = self.makeTile();


			self.render();
		},

		gameover: function() {
			var self = this;

			self.gameState = gameState.GAMEOVER;

			self.$elem.find('.gameover').slideDown();
			
			window.clearInterval(self.timer);

		},

		togglePause: function() {
			var self = this;

			switch ((self.gameState+1)%2)
			{
				case gameState.PAUSED:
					self.pause();
					break;
				case gameState.RUNNING:
					self.resume();
					break;
			}

		},

		pause: function() {
			var self = this;

			self.gameState = gameState.PAUSED;
			window.clearInterval(self.timer);
			
			console.log('game paused');
		},

		resume: function() {
			var self = this;

			self.gameState = gameState.RUNNING;
			self.timer = setInterval(function() {
				self.cycle();
			}, self.options.refresh );
		}

	};


	$.fn.tetris = function(options) {
		
		return this.each(function() {

 			if (!$(this).data("tetris")) {

 				//create our new instance of the Tetris object and store it in the element's .data object
				var tetrisInstance = Object.create(Tetris);
				tetrisInstance.init(this, options);

                $(this).data("tetris", tetrisInstance);
            }

		});
	};


	$.fn.tetris.options = {
		level: 0,
		refresh: 1500, 
		rows: 22,
		columns: 10,
		tileSize: 16,
	};
	

}(jQuery, window, document));