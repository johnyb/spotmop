'use strict';

angular.module('spotmop.browse.playlist', [])

/**
 * Routing 
 **/
.config(function($stateProvider) {
	$stateProvider
		.state('browse.playlist', {
			url: "/playlist/:uri",
			templateUrl: "app/browse/playlist/template.html",
			controller: 'PlaylistController'
		});
})
	
/**
 * Main controller
 **/
.controller('PlaylistController', function PlaylistController( $scope, $rootScope, SpotifyService, SettingsService, DialogService, $stateParams, $sce ){
	
	// setup base variables
	$scope.playlist = {};
	$scope.tracks = {};
	$scope.totalTime = 0;
    $scope.following = false;
    $scope.followPlaylist = function(){
        SpotifyService.followPlaylist( $stateParams.uri )
            .success( function(response){
                $scope.following = true;
				$scope.updatePlaylists();
            });
    }
    $scope.unfollowPlaylist = function(){
        SpotifyService.unfollowPlaylist( $stateParams.uri )
            .success( function(response){
                $scope.following = false;
    			$rootScope.$broadcast('spotmop:notifyUser', {id: 'removing-playlist', message: 'Playlist removed', autoremove: true});
				$scope.updatePlaylists();
            });
    }
    $scope.recoverPlaylist = function(){
        SpotifyService.followPlaylist( $stateParams.uri )
            .success( function(response){
                $scope.following = true;
    			$rootScope.$broadcast('spotmop:notifyUser', {id: 'recovering-playlist', message: 'Playlist recovered', autoremove: true});
				$scope.updatePlaylists();
            });
    }
    $scope.editPlaylist = function(){		
        DialogService.create('editPlaylist', $scope);
    }
	
    // figure out the total time for all tracks
    $scope.totalTime = function(){
        var totalTime = 0;
        if( $scope.tracks.length > 0 ){
            $.each( $scope.tracks.items, function( key, track ){
                totalTime += track.track.duration_ms;
            });	
        }
        return Math.round(totalTime / 100000);   
    }
    
    $rootScope.$broadcast('spotmop:notifyUser', {type: 'loading', id: 'loading-playlist', message: 'Loading'});

	// on load, fetch the playlist
	SpotifyService.getPlaylist( $stateParams.uri )
		.success(function( response ) {
			$scope.playlist = response;
			$scope.tracks = response.tracks;
		
			// parse description string and make into real html (people often have links here)
			$scope.playlist.description = $sce.trustAsHtml( $scope.playlist.description );
        
            // figure out if we're following this playlist
            SpotifyService.isFollowingPlaylist( $stateParams.uri, SettingsService.getSetting('spotifyuserid',null) )
                .success( function( isFollowing ){
                    $scope.following = $.parseJSON(isFollowing);
                    $rootScope.$broadcast('spotmop:notifyUserRemoval', {id: 'loading-playlist'});
                });
		})
        .error(function( error ){
            $rootScope.$broadcast('spotmop:notifyUserRemoval', {id: 'loading-playlist'});
            $rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'loading-playlist', message: error.error.message});
        });
    
    /**
     * Load more of the playlist's tracks
     * Triggered by scrolling to the bottom
     **/
    
    var loadingMoreTracks = false;
    
    // go off and get more of this playlist's tracks
    function loadMoreTracks( $nextUrl ){
        
        if( typeof( $nextUrl ) === 'undefined' )
            return false;
        
        // update our switch to prevent spamming for every scroll event
        loadingMoreTracks = true;   
        
        $rootScope.$broadcast('spotmop:notifyUser', {type: 'loading', id: 'loading-more-tracks', message: 'Loading tracks'});

        // go get our 'next' URL
        SpotifyService.getUrl( $nextUrl )
            .success(function( response ){
            
                // append these new tracks to the main tracklist
                $scope.tracks.items = $scope.tracks.items.concat( response.items );
                
                // save the next set's url (if it exists)
                $scope.tracks.next = response.next;
                
                // update loader and re-open for further pagination objects
                $rootScope.$broadcast('spotmop:notifyUserRemoval', {id: 'loading-more-tracks'});
                loadingMoreTracks = false;
            })
            .error(function( error ){
                $rootScope.$broadcast('spotmop:notifyUserRemoval', {id: 'loading-more-tracks'});
                $rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'loading-more-tracks', message: error.error.message});
                loadingMoreTracks = false;
            });
    }
    
    // on scroll, detect if we're near the bottom
    $('#body').on('scroll', function(evt){
        
        // get our ducks in a row - these are all the numbers we need
        var scrollPosition = $(this).scrollTop();
        var frameHeight = $(this).outerHeight();
        var contentHeight = $(this).children('.inner').outerHeight();
        var distanceFromBottom = -( scrollPosition + frameHeight - contentHeight );
        
        // check if we're near to the bottom of the tracklist, and we're not already loading more tracks
        if( distanceFromBottom <= 100 && !loadingMoreTracks && $scope.tracks.next ){
            loadMoreTracks( $scope.tracks.next );
        }
    });
});