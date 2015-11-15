/**
 * Create a Spotify service 
 *
 * This holds all of the Spotify API calls, and returns the response (or promise)
 * back to the caller.
 * @return dataFactory array
 **/
 
angular.module('spotmop.services.spotify', [])

.factory("SpotifyService", ['$rootScope', '$resource', '$localStorage', '$http', '$interval', '$timeout', '$filter', '$q', 'SettingsService', function( $rootScope, $resource, $localStorage, $http, $interval, $timeout, $filter, $q, SettingsService ){

	// set container for spotify storage
	if( typeof($localStorage.spotify) === 'undefined' )
		$localStorage.spotify = {};
		
	if( typeof($localStorage.spotify.AccessToken) === 'undefined' )
		$localStorage.spotify.AccessToken = null;
		
	if( typeof($localStorage.spotify.RefreshToken) === 'undefined' )
		$localStorage.spotify.RefreshToken = null;
		
	if( typeof($localStorage.spotify.AuthorizationCode) === 'undefined' )
		$localStorage.spotify.AuthorizationCode = null;
		
	if( typeof($localStorage.spotify.AccessTokenExpiry) === 'undefined' )
		$localStorage.spotify.AccessTokenExpiry = null;
		
	if( typeof($localStorage.spotify.ClientID) === 'undefined' )
		$localStorage.spotify.ClientID = 'a87fb4dbed30475b8cec38523dff53e2';
	
	if( !$localStorage.spotify.AuthorizationCode )
		getAuthorizationCode();

	// on load, get a new token
	// this means we [easily] know how long it's been since last refreshed
	getNewToken();
	
	// setup automatic refreshing (tokens last for 3600 seconds, so let's refresh every 3500 seconds)
	$interval( getNewToken, 3500000 );
	
	/**
	 * Get a Spotify API authorisation code
	 * This is only needed once for this account on this device. It is used to acquire access tokens (which expire)
	 **/
	function getAuthorizationCode(){
		
		// save current URL, before we redirect
		localStorage.returnURL = window.location.href;
		
		var newURL = '';
		newURL += 'https://accounts.spotify.com/authorize?client_id='+$localStorage.spotify.ClientID;
		newURL += '&redirect_uri='+window.location.protocol+'//'+window.location.host+'/spotify-authorization';
		newURL += '&scope=playlist-modify-private%20playlist-modify-public%20playlist-read-private%20playlist-modify-private%20user-follow-read%20user-library-read%20user-library-modify%20user-follow-modify';
		newURL += '&response_type=code&show_dialog=true';
		
		// open a new window to handle this authentication
		window.open(newURL,'spotifyAPIrequest','height=550,width=400');
	}
	
	/**
	 * Get a new access token
	 * These expire, so require frequent refreshing
	 **/
	function getNewToken(){		
		return $.ajax({
			url: '/spotify-authorization?refresh_token='+$localStorage.spotify.RefreshToken,
			type: "GET",
			dataType: "json",
			async: false,
			timeout: 5000,
			success: function(response){
				$localStorage.spotify.AccessToken = response.access_token;
				$localStorage.spotify.AccessTokenExpiry = new Date().getTime() + 3600000;
				$rootScope.spotifyOnline = true;
			},
			fail: function(response){
				notifyUser('bad','There was a problem connecting to Spotify: '+response.responseJSON.error.message);
				$rootScope.spotifyOnline = false;
			}
		});
	}

	
	// specify the base URL for the API endpoints
    var urlBase = 'https://api.spotify.com/v1/';
	var country = SettingsService.getSetting("spotifycountry", 'NZ');
	var locale = SettingsService.getSetting("spotifylocale", "en_NZ");
	
	// setup response object
    return {
		
		logout: function(){
			$localStorage.spotify = {};
			$rootScope.spotifyOnline = false;
		},
	   
        getNewToken: function(){
            getNewToken();  
        },
        
		/**
		 * Get an element from a URI
		 * @param element = string, the element we wish to extract
		 * @param uri = string
		 **/
		getFromUri: function( element, uri ){
			var exploded = uri.split(':');			
			if( element == 'userid' && exploded[1] == 'user' )
				return exploded[2];				
			if( element == 'playlistid' && exploded[3] == 'playlist' )
				return exploded[4];				
			if( element == 'artistid' && exploded[1] == 'artist' )
				return exploded[2];				
			if( element == 'albumid' && exploded[1] == 'album' )
				return exploded[2];				
			if( element == 'trackid' && exploded[1] == 'track' )
				return exploded[2];				
			return null;
		},
        
        /**
         * Generic calls
         */
        getUrl: function( $url ){
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'GET',
					url: $url,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getUrl', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
        },
        
        /**
         * Users
         **/
        
        getMe: function(){
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'GET',
					url: urlBase+'me/',
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getMe', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
        },
        
        getUser: function( useruri ){
		
			var userid = this.getFromUri( 'userid', useruri );
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'GET',
					url: urlBase+'users/'+userid,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getUser', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
        },
		
		isFollowing: function( type, uri ){
			
			var id = this.getFromUri( type+'id', uri );
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'GET',
					url: urlBase+'me/following/contains?type='+type+'&ids='+id,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'isFollowing', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
        
        
        /**
         * Track based requests
         **/
	
		getTrack: function( trackuri ){
			
			var trackid = this.getFromUri('trackid', trackuri);
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'GET',
					url: urlBase+'tracks/'+trackid,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getTrack', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
        
	
		/**
		 * Library requests
		 * These are mostly /me related
		 **/   
		
		getMyTracks: function( userid ){
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'GET',
					url: urlBase+'me/tracks/',
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getMyTracks', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		}, 
		
		addTracksToLibrary: function( trackids ){
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'GET',
					url: urlBase+'me/tracks',
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'addTracksToLibrary', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		deleteTracksFromLibrary: function( trackids ){
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'DELETE',
					url: urlBase+'me/tracks',
					dataType: "json",
					data: JSON.stringify( { ids: trackids } ),
					contentType: "application/json; charset=utf-8",
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'deleteTracksFromLibrary', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		getMyArtists: function( userid ){
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'GET',
					url: urlBase+'me/following?type=artist',
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getMyArtists', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		isFollowingArtist: function( artisturi, userid ){
			
			var artistid = this.getFromUri( 'artistid', artisturi );			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					cache: false,
					method: 'GET',
					url: urlBase+'me/following/contains?type=artist&ids='+artistid,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'isFollowingArtist', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		followArtist: function( artisturi ){
			
			var artistid = this.getFromUri( 'artistid', artisturi );			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'PUT',
					cache: false,
					url: urlBase+'me/following?type=artist&ids='+artistid,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'followArtist', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		unfollowArtist: function( artisturi ){
			
			var artistid = this.getFromUri( 'artistid', artisturi );			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'DELETE',
					cache: false,
					url: urlBase+'me/following?type=artist&ids='+artistid,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'unfollowArtist', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
	
		/**
		 * Playlist-oriented requests
		 **/     
		
		getPlaylists: function( userid, limit ){
			
			if( typeof( limit ) === 'undefined' )
				limit = 40;
				
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					cache: true,
					method: 'GET',
					url: urlBase+'users/'+userid+'/playlists?limit='+limit,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getPlaylists', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		getPlaylist: function( playlisturi ){
			
			// get the user and playlist ids from the uri
			var userid = this.getFromUri( 'userid', playlisturi );
			var playlistid = this.getFromUri( 'playlistid', playlisturi );
				
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					cache: true,
					method: 'GET',
					url: urlBase+'users/'+userid+'/playlists/'+playlistid+'?market='+country,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getPlaylist', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		isFollowingPlaylist: function( playlisturi, ids ){
			
			var userid = this.getFromUri( 'userid', playlisturi );
			var playlistid = this.getFromUri( 'playlistid', playlisturi );
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					cache: true,
					method: 'GET',
					url: urlBase+'users/'+userid+'/playlists/'+playlistid+'/followers/contains?ids='+ids,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'isFollowingPlaylist', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		followPlaylist: function( playlisturi ){
			
			var userid = this.getFromUri( 'userid', playlisturi );
			var playlistid = this.getFromUri( 'playlistid', playlisturi );
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'PUT',
					url: urlBase+'users/'+userid+'/playlists/'+playlistid+'/followers',
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'followPlaylist', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		unfollowPlaylist: function( playlisturi ){
			
			var userid = this.getFromUri( 'userid', playlisturi );
			var playlistid = this.getFromUri( 'playlistid', playlisturi );
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'DELETE',
					url: urlBase+'users/'+userid+'/playlists/'+playlistid+'/followers',
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'unfollowPlaylist', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		featuredPlaylists: function( limit ){
			
			if( typeof( limit ) === 'undefined' )
				limit = 40;
			
			var timestamp = $filter('date')(new Date(),'yyyy-MM-ddTHH:mm:ss');
			var country = SettingsService.getSetting('countrycode','NZ');
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					cache: true,
					method: 'GET',
					url: urlBase+'browse/featured-playlists?timestamp='+timestamp+'&country='+country+'&limit='+limit,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'featuredPlaylists', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		addTracksToPlaylist: function( playlisturi, tracks ){
			
			// get the user and playlist ids from the uri
			var userid = this.getFromUri( 'userid', playlisturi );
			var playlistid = this.getFromUri( 'playlistid', playlisturi );
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'POST',
					url: urlBase+'users/'+userid+'/playlists/'+playlistid+'/tracks',
					//url: urlBase+'users/'+$localStorage.spotify.userid+'/playlists/'+playlistid+'/tracks',
					dataType: "json",
					data: JSON.stringify( { uris: tracks } ),
					contentType: "application/json; charset=utf-8",
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'addTracksToPlaylist', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		movePlaylistTracks: function( playlisturi, range_start, range_length, insert_before ){
            
			var userid = this.getFromUri( 'userid', playlisturi );
			var playlistid = this.getFromUri( 'playlistid', playlisturi );
			
            if( userid != SettingsService.getSetting('spotifyuserid',null) )
                return false;
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'PUT',
					url: urlBase+'users/'+userid+'/playlists/'+playlistid+'/tracks',
					dataType: "json",
					data: JSON.stringify({
						range_start: range_start,
						range_length: range_length,
						insert_before: insert_before
					}),
					contentType: "application/json; charset=utf-8",
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'movePlaylistTracks', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		deleteTracksFromPlaylist: function( playlisturi, tracks ){
			
			// get the user and playlist ids from the uri
			var userid = this.getFromUri( 'userid', playlisturi );
			var playlistid = this.getFromUri( 'playlistid', playlisturi );
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'DELETE',
					url: urlBase+'users/'+userid+'/playlists/'+playlistid+'/tracks',
					//url: urlBase+'users/'+$localStorage.spotify.userid+'/playlists/'+playlistid+'/tracks',
					dataType: "json",
					data: JSON.stringify( { tracks: tracks } ),
					contentType: "application/json; charset=utf-8",
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'deleteTracksFromPlaylist', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		// create a new playlist
		// @param userid id of the user to own this playlist (usually self)
		// @param data json array {name: "Name", public: boolean}
		createPlaylist: function( userid, data ){
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'POST',
					url: urlBase+'users/'+userid+'/playlists/',
					dataType: "json",
					data: data,
					contentType: "application/json; charset=utf-8",
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'createPlaylist', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		// update a playlist's details
		// @param playlisturi
		// @param data json array {name: "Name", public: boolean}
		updatePlaylist: function( playlisturi, data ){
			
			// get the user and playlist ids from the uri
			var userid = this.getFromUri( 'userid', playlisturi );
			var playlistid = this.getFromUri( 'playlistid', playlisturi );
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'PUT',
					url: urlBase+'users/'+userid+'/playlists/'+playlistid,
					dataType: "json",
					data: data,
					contentType: "application/json; charset=utf-8",
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'updatePlaylist', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		/**
		 * Discover
		 **/
		newReleases: function( limit ){
			
			if( typeof( limit ) === 'undefined' )
				limit = 40;
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					cache: true,
					method: 'GET',
					url: urlBase+'browse/new-releases?country='+ country +'&limit='+limit,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'newReleases', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		discoverCategories: function( limit ){
			
			if( typeof( limit ) === 'undefined' )
				limit = 40;
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					cache: true,
					method: 'GET',
					url: urlBase+'browse/categories?limit='+limit,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'discoverCategories', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		getCategory: function( categoryid ){
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					cache: true,
					method: 'GET',
					url: urlBase+'browse/categories/'+categoryid,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getCategory', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		getCategoryPlaylists: function( categoryid, limit ){
			
			if( typeof( limit ) === 'undefined' )
				limit = 40;
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					cache: true,
					method: 'GET',
					url: urlBase+'browse/categories/'+categoryid+'/playlists?limit='+limit,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getCategoryPlaylists', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		/**
		 * Artist
		 **/
		 
		getArtist: function( artisturi ){
			
			var artistid = this.getFromUri( 'artistid', artisturi );
			
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					cache: true,
					method: 'GET',
					url: urlBase+'artists/'+artistid,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getArtist', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		 
		getArtists: function( artisturis ){
			
			var self = this;
			var artistids = '';
			angular.forEach( artisturis, function( artisturi ){
				if( artistids != '' ) artistids += ',';
				artistids += self.getFromUri( 'artistid', artisturi );
			});
		
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					method: 'GET',
					url: urlBase+'artists/?ids='+artistids,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getArtists', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		getAlbums: function( artisturi ){
					
			$rootScope.requestsLoading++;
			var artistid = this.getFromUri( 'artistid', artisturi );
            var deferred = $q.defer();

            $http({
					cache: true,
					method: 'GET',
					url: urlBase+'artists/'+artistid+'/albums?album_type=album,single&market='+country,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getArtists', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		getAlbum: function( albumuri ){
		
			$rootScope.requestsLoading++;			
            var deferred = $q.defer();			
			var albumid = this.getFromUri( 'albumid', albumuri );

            $http({
					method: 'GET',
					url: urlBase+'albums/'+albumid,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getAlbum', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		getTopTracks: function( artisturi ){
		
			var artistid = this.getFromUri( 'artistid', artisturi );
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					cache: true,
					method: 'GET',
					url: urlBase+'artists/'+artistid+'/top-tracks?country='+country,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getTopTracks', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		getRelatedArtists: function( artisturi ){
		
			var artistid = this.getFromUri( 'artistid', artisturi );
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					cache: true,
					method: 'GET',
					url: urlBase+'artists/'+artistid+'/related-artists',
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getRelatedArtists', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		},
		
		/**
		 * Search results
		 * @param type = string (album|artist|track|playlist)
		 * @param query = string (search term)
		 * @param limit = int (optional)
		 **/
		getSearchResults: function( type, query, limit ){
		
			if( typeof( limit ) === 'undefined' ) limit = 10;
			$rootScope.requestsLoading++;
            var deferred = $q.defer();

            $http({
					cache: true,
					method: 'GET',
					url: urlBase+'search?q='+query+'&type='+type+'&country='+country+'&limit='+limit,
					headers: {
						Authorization: 'Bearer '+ $localStorage.spotify.AccessToken
					}
				})
                .success(function( response ){
					$rootScope.requestsLoading--;
                    deferred.resolve( response );
                })
                .error(function( response ){
					$rootScope.requestsLoading--;
					$rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'getSearchResults', message: response.error.message});
                    deferred.reject( response.error.message );
                });
				
            return deferred.promise;
		}
	};
}]);





