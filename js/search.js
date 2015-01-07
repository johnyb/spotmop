/*
 * Spotmop
 * By James Barnsley (http://jamesbarnsley.co.nz
 * 
 * Search for tracks
 *
 */


/*
 * Run a search for all content that matches a supplied term
 * @var query = string of search query
*/
function startSearch( query ){
	
	// reveal search results menu item
	$('.search-results-menu-item').show();
	
	// artists
	updateLoader('start');
	getSearchResults( 'artist', query ).success( function(response){
		
		var artists = response.artists.items;
		updateLoader('stop');
		
		for( var i = 0; i < artists.length; i++ ){
			
			var artist = artists[i];
			
			if( artist.images.length > 0 )
				imageURL = artist.images[0].url;
				
			$('#search .artists').append( '<a class="artist-panel" data-uri="'+artist.uri+'" style="background-image: url('+imageURL+');" href="#artist/'+artist.uri+'"><span class="name animate">'+artist.name+'</span></a>' );
		}
		
	});
	
	// albums
	updateLoader('start');
	getSearchResults( 'album', query ).success( function(response){
		
		var albums = response.albums.items;
		updateLoader('stop');
		
		for( var i = 0; i < albums.length; i++ ){
			
			var album = albums[i];
			
			if( album.images.length > 0 )
				imageURL = album.images[0].url;
			
			$('#search .albums').append( '<a class="album-panel" data-uri="'+album.uri+'" style="background-image: url('+imageURL+');" href="#album/'+album.uri+'"><span class="name animate">'+album.name+'</span></a>' );
		}
		
	});
	
	// tracks
	updateLoader('start');
	getSearchResults( 'track', query ).success( function(response){
		updateLoader('stop');
		renderTracksTable( $('#search .tracks'), response.tracks.items );
	});
	
	// playlists
	updateLoader('start');
	getSearchResults( 'playlist', query ).success( function(response){
	
		var playlists = response.playlists.items;
		updateLoader('stop');
		
		for( var i = 0; i < playlists.length; i++ ){
			
			var playlist = playlists[i];
			
			if( playlist.images.length > 0 )
				imageURL = playlist.images[0].url;
			
			$('#search .playlists').append( '<a class="album-panel" data-uri="'+playlist.uri+'" style="background-image: url('+imageURL+');" href="#playlist/'+playlist.uri+'"><span class="name animate">'+playlist.name+'</span></a>' );
		}
	});
	
};



/*
 * Whence our document is ready
 * Initiate search functions
*/
$(document).ready( function(evt){

	// search submit <enter>
	$('.search-field input').keyup(function(evt){
		if( $(this).val() != '' && evt.keyCode == 13 )
			window.location.hash = 'search/'+$(this).val();
	});
	
	// search submit click
	$('.search-field .submit').on('click', function(evt){
		if( $(this).siblings('input').val() != '' )
			window.location.hash = 'search/'+$(this).siblings('input').val();
	});

});